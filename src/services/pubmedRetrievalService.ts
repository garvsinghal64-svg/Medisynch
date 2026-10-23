import { EvidenceRetrievalStatus } from '../types/clinical';

export const EVIDENCE_RETRIEVAL_FAILED_MESSAGE =
  'Evidence retrieval failed. No citations available.';

export interface PubMedArticleSummary {
  pmid: string;
  title: string;
  journal: string;
  pubDate: string;
  abstractText: string;
}

export interface PubMedRetrievalResult {
  status: EvidenceRetrievalStatus;
  articles: PubMedArticleSummary[];
  formattedContext: string;
  requestedCount: number;
  retrievedCount: number;
  incompleteCount: number;
  errorMessage?: string;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

let customFetchImpl: FetchLike | null = null;

/**
 * Allows unit/integration tests to inject a mock fetch implementation for NCBI E-utilities.
 */
export function setPubMedFetchImplementation(fn: FetchLike | null): void {
  customFetchImpl = fn;
}

function getActiveFetch(): FetchLike {
  if (customFetchImpl) return customFetchImpl;
  return globalThis.fetch.bind(globalThis);
}

/**
 * Decodes standard and numeric XML/HTML entities in PubMed metadata and abstracts.
 */
export function decodeXmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Strips nested inline XML tags (e.g., <i>, <b>, <sup>, <sub>) and decodes XML entities.
 */
export function cleanXmlElementText(rawXmlFragment: string): string {
  if (!rawXmlFragment) return '';
  const withoutTags = rawXmlFragment.replace(/<[^>]+>/g, '');
  return decodeXmlEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

function extractPubDateFromXmlBlock(block: string): string {
  const pubDateBlockMatch = block.match(/<PubDate[^>]*>([\s\S]*?)<\/PubDate>/i);
  const searchTarget = pubDateBlockMatch ? pubDateBlockMatch[1] : block;
  const yearMatch = searchTarget.match(/<Year[^>]*>(\d{4})<\/Year>/i);
  const monthMatch = searchTarget.match(/<Month[^>]*>([A-Za-z0-9]+)<\/Month>/i);
  if (yearMatch && yearMatch[1]) {
    const year = yearMatch[1].trim();
    const month = monthMatch && monthMatch[1] ? monthMatch[1].trim() : '';
    return month ? `${year} ${month}` : year;
  }
  const medlineDateMatch = searchTarget.match(/<MedlineDate[^>]*>([\s\S]*?)<\/MedlineDate>/i);
  if (medlineDateMatch && medlineDateMatch[1]) {
    return cleanXmlElementText(medlineDateMatch[1]);
  }
  return '';
}

/**
 * Parses XML from NCBI efetch (PubmedArticleSet) to extract PMID, Title, Journal, PubDate, and Abstract.
 * Never infers a missing PMID from requestedPmids and never substitutes full XML or title for a missing abstract.
 */
export function parseEfetchXml(xml: string, requestedPmids: string[] = []): PubMedArticleSummary[] {
  const articles: PubMedArticleSummary[] = [];
  if (!xml || typeof xml !== 'string') return articles;

  const allowedSet = requestedPmids.length > 0 ? new Set(requestedPmids.map((id) => id.trim())) : null;
  const articleBlocks = xml.match(/<PubmedArticle[\s\S]*?<\/PubmedArticle>/gi) || [];

  const extractFromBlock = (block: string): PubMedArticleSummary | null => {
    // Prefer the article-level MedlineCitation PMID first
    const medlineBlockMatch = block.match(/<MedlineCitation[\s\S]*?<\/MedlineCitation>/i);
    const pmidSource = medlineBlockMatch ? medlineBlockMatch[0] : block;
    const pmidMatch = pmidSource.match(/<PMID[^>]*>(\d+)<\/PMID>/i);

    // Never infer a missing PMID from requestedPmids[0]
    if (!pmidMatch || !pmidMatch[1]) {
      return null;
    }

    const resolvedPmid = pmidMatch[1].trim();
    if (allowedSet && !allowedSet.has(resolvedPmid)) {
      return null;
    }

    const titleMatch = block.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/i);
    const journalBlockMatch = block.match(/<Journal[^>]*>([\s\S]*?)<\/Journal>/i);
    const journalSearch = journalBlockMatch ? journalBlockMatch[1] : block;
    const journalMatch =
      journalSearch.match(/<Title[^>]*>([\s\S]*?)<\/Title>/i) ||
      journalSearch.match(/<ISOAbbreviation[^>]*>([\s\S]*?)<\/ISOAbbreviation>/i);

    const abstractMatches = Array.from(
      block.matchAll(/<AbstractText(\s+[^>]*)?>([\s\S]*?)<\/AbstractText>/gi)
    );
    const abstractText = abstractMatches
      .map((m) => {
        const attrs = m[1] || '';
        const labelMatch = attrs.match(/Label\s*=\s*["']([^"']+)["']/i);
        const cleanedBody = cleanXmlElementText(m[2]);
        if (!cleanedBody) return '';
        return labelMatch && labelMatch[1]
          ? `${decodeXmlEntities(labelMatch[1].trim())}: ${cleanedBody}`
          : cleanedBody;
      })
      .filter(Boolean)
      .join(' ');

    return {
      pmid: resolvedPmid,
      title: titleMatch ? cleanXmlElementText(titleMatch[1]) : '',
      journal: journalMatch ? cleanXmlElementText(journalMatch[1]) : '',
      pubDate: extractPubDateFromXmlBlock(block),
      abstractText,
    };
  };

  if (articleBlocks.length > 0) {
    for (const block of articleBlocks) {
      const parsed = extractFromBlock(block);
      if (parsed) {
        articles.push(parsed);
      }
    }
  } else if (xml.includes('<AbstractText') || xml.includes('<ArticleTitle')) {
    const parsed = extractFromBlock(xml);
    if (parsed) {
      articles.push(parsed);
    }
  }

  return articles;
}

export function formatPubMedArticlesForPrompt(articles: PubMedArticleSummary[]): string {
  if (!articles || articles.length === 0) {
    return EVIDENCE_RETRIEVAL_FAILED_MESSAGE;
  }

  return articles
    .map(
      (art, idx) =>
        `Source ${idx + 1}: [PMID: ${art.pmid}]\nTitle: ${art.title}\nJournal: ${art.journal || 'Not specified in record'}${art.pubDate ? ` (${art.pubDate})` : ''}\nAbstract: ${art.abstractText}`
    )
    .join('\n\n');
}

class PubMedRetrievalService {
  /**
   * Queries NCBI E-utilities (`esearch` -> `esummary` & `efetch`) to retrieve the top 3-5
   * most relevant PubMed articles with explicit structured retrieval status.
   * Never constructs titles, journals, dates, or abstracts from a PMID alone,
   * and never substitutes a title for a missing abstract.
   */
  public async fetchRelevantLiteratureWithStatus(keywords: string[]): Promise<PubMedRetrievalResult> {
    const cleanKeywords = (keywords || [])
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (cleanKeywords.length === 0) {
      return {
        status: 'not-requested',
        articles: [],
        formattedContext: EVIDENCE_RETRIEVAL_FAILED_MESSAGE,
        requestedCount: 0,
        retrievedCount: 0,
        incompleteCount: 0,
        errorMessage: 'No search keywords provided for PubMed retrieval.',
      };
    }

    const queryTerm = cleanKeywords.join(' ');
    const fetchFn = getActiveFetch();

    try {
      // Step 1: Query NCBI E-utilities esearch for top 3-5 PMIDs
      const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
        queryTerm
      )}&retmax=5&retmode=json&sort=relevance`;

      const esearchRes = await fetchFn(esearchUrl);
      if (!esearchRes.ok) {
        return {
          status: 'failed',
          articles: [],
          formattedContext: EVIDENCE_RETRIEVAL_FAILED_MESSAGE,
          requestedCount: 0,
          retrievedCount: 0,
          incompleteCount: 0,
          errorMessage: `PubMed esearch failed with HTTP ${esearchRes.status}.`,
        };
      }

      const esearchData = await esearchRes.json();
      const idList: string[] = (esearchData?.esearchresult?.idlist || [])
        .map((id: unknown) => String(id).trim())
        .filter((id: string) => /^\d+$/.test(id))
        .slice(0, 5);

      if (idList.length === 0) {
        return {
          status: 'no-results',
          articles: [],
          formattedContext: EVIDENCE_RETRIEVAL_FAILED_MESSAGE,
          requestedCount: 0,
          retrievedCount: 0,
          incompleteCount: 0,
          errorMessage: 'PubMed esearch returned no matching PMIDs.',
        };
      }

      // Step 2: Query esummary / efetch for real Title, Journal, PubDate, and Abstract data
      const summariesByPmid: Record<string, Partial<PubMedArticleSummary>> = {};
      let detailFetchSucceeded = false;

      try {
        const esummaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(
          ','
        )}&retmode=json`;
        const esummaryRes = await fetchFn(esummaryUrl);
        if (esummaryRes.ok) {
          detailFetchSucceeded = true;
          const esummaryJson = await esummaryRes.json();
          const resultObj = esummaryJson?.result || {};
          for (const pmid of idList) {
            const item = resultObj[pmid];
            if (item && typeof item === 'object') {
              const parsedTitle = item.title ? cleanXmlElementText(String(item.title)) : '';
              const parsedJournal = item.fulljournalname
                ? cleanXmlElementText(String(item.fulljournalname))
                : item.source
                  ? cleanXmlElementText(String(item.source))
                  : '';
              const parsedPubDate = item.pubdate ? cleanXmlElementText(String(item.pubdate)) : '';
              const parsedAbstract = item.abstract
                ? cleanXmlElementText(String(item.abstract))
                : item.summary
                  ? cleanXmlElementText(String(item.summary))
                  : '';

              if (parsedTitle || parsedAbstract) {
                summariesByPmid[pmid] = {
                  pmid,
                  title: parsedTitle,
                  journal: parsedJournal,
                  pubDate: parsedPubDate,
                  abstractText: parsedAbstract,
                };
              }
            }
          }
        }
      } catch {
        // Proceed to efetch if esummary is not mocked or fails
      }

      // Fetch full abstracts and metadata via efetch whenever any title or abstractText is still missing
      const needsEfetch = idList.some(
        (id) => !summariesByPmid[id]?.title || !summariesByPmid[id]?.abstractText
      );
      if (needsEfetch) {
        try {
          const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${idList.join(
            ','
          )}&retmode=xml`;
          const efetchRes = await fetchFn(efetchUrl);
          if (efetchRes.ok) {
            detailFetchSucceeded = true;
            const contentType = efetchRes.headers?.get?.('content-type') || '';
            if (contentType.includes('application/json')) {
              const efetchJson = await efetchRes.json();
              const articlesList = Array.isArray(efetchJson?.articles) ? efetchJson.articles : [];
              for (const art of articlesList) {
                const artPmid = art?.pmid ? String(art.pmid).trim() : '';
                if (artPmid && idList.includes(artPmid)) {
                  const existing = summariesByPmid[artPmid] || {};
                  const title = art.title ? cleanXmlElementText(String(art.title)) : existing.title || '';
                  const journal = art.journal
                    ? cleanXmlElementText(String(art.journal))
                    : existing.journal || '';
                  const pubDate = art.pubDate
                    ? cleanXmlElementText(String(art.pubDate))
                    : existing.pubDate || '';
                  const abstractText = art.abstract
                    ? cleanXmlElementText(String(art.abstract))
                    : art.abstractText
                      ? cleanXmlElementText(String(art.abstractText))
                      : existing.abstractText || '';
                  summariesByPmid[artPmid] = {
                    pmid: artPmid,
                    title,
                    journal,
                    pubDate,
                    abstractText,
                  };
                }
              }
            } else {
              const rawText = await efetchRes.text();
              const parsedXml = parseEfetchXml(rawText, idList);
              for (const parsed of parsedXml) {
                const existing = summariesByPmid[parsed.pmid] || {};
                summariesByPmid[parsed.pmid] = {
                  pmid: parsed.pmid,
                  title: parsed.title || existing.title || '',
                  journal: parsed.journal || existing.journal || '',
                  pubDate: parsed.pubDate || existing.pubDate || '',
                  abstractText: parsed.abstractText || existing.abstractText || '',
                };
              }
            }
          }
        } catch {
          // Handled below via detailFetchSucceeded and finalArticles check
        }
      }

      if (!detailFetchSucceeded) {
        return {
          status: 'failed',
          articles: [],
          formattedContext: EVIDENCE_RETRIEVAL_FAILED_MESSAGE,
          requestedCount: idList.length,
          retrievedCount: 0,
          incompleteCount: idList.length,
          errorMessage: 'Failed to retrieve article metadata from PubMed esummary/efetch.',
        };
      }

      const finalArticles: PubMedArticleSummary[] = [];
      let incompleteCount = 0;

      for (const pmid of idList) {
        const entry = summariesByPmid[pmid];
        // Require BOTH a real parsed title AND a real parsed abstract (never substitute title for abstract)
        if (entry && entry.title && entry.title.trim() && entry.abstractText && entry.abstractText.trim()) {
          finalArticles.push({
            pmid,
            title: entry.title.trim(),
            journal: entry.journal?.trim() || '',
            pubDate: entry.pubDate?.trim() || '',
            abstractText: entry.abstractText.trim(),
          });
        } else {
          incompleteCount += 1;
        }
      }

      if (finalArticles.length === 0) {
        return {
          status: 'incomplete-metadata',
          articles: [],
          formattedContext: EVIDENCE_RETRIEVAL_FAILED_MESSAGE,
          requestedCount: idList.length,
          retrievedCount: 0,
          incompleteCount,
          errorMessage:
            'PubMed records were found, but complete article metadata (title and abstract) could not be verified.',
        };
      }

      const status: EvidenceRetrievalStatus =
        incompleteCount > 0 ? 'live-partial' : 'live-success';

      return {
        status,
        articles: finalArticles,
        formattedContext: formatPubMedArticlesForPrompt(finalArticles),
        requestedCount: idList.length,
        retrievedCount: finalArticles.length,
        incompleteCount,
      };
    } catch (err: any) {
      return {
        status: 'failed',
        articles: [],
        formattedContext: EVIDENCE_RETRIEVAL_FAILED_MESSAGE,
        requestedCount: 0,
        retrievedCount: 0,
        incompleteCount: 0,
        errorMessage: err?.message || 'Unexpected error during PubMed retrieval.',
      };
    }
  }

  /**
   * Backwards-compatible string helper returning formatted PubMed context or explicit failure message.
   */
  public async fetchRelevantLiterature(keywords: string[]): Promise<string> {
    const result = await this.fetchRelevantLiteratureWithStatus(keywords);
    return result.formattedContext;
  }
}

export const pubmedRetrievalService = new PubMedRetrievalService();
export const fetchRelevantLiterature =
  pubmedRetrievalService.fetchRelevantLiterature.bind(pubmedRetrievalService);
export const fetchRelevantLiteratureWithStatus =
  pubmedRetrievalService.fetchRelevantLiteratureWithStatus.bind(pubmedRetrievalService);
