/**
 * SharePoint REST API utility for fetching items with pagination support
 * Handles 100k+ items efficiently using @odata.nextLink
 */

export interface SharePointConfig {
  siteUrl: string
  listName: string
  pageSize?: number
  selectFields?: string[]
}

export interface SharePointItem {
  ID: number
  Title: string
  FileLeafRef?: string
  FilePath?: string
  FileType?: string
  FSObjType?: number
  FileURL?: string
  IsFolder?: boolean
  [key: string]: any
}

const DEFAULT_CONFIG: Partial<SharePointConfig> = {
  pageSize: 5000,
  selectFields: ['ID', 'Title', 'FileLeafRef', 'FilePath', 'FileType', 'FSObjType', 'FileURL', 'IsFolder'],
}

/**
 * Fetch all items from a SharePoint list with automatic pagination
 * @param config SharePoint configuration
 * @returns Array of all items from the list
 */
export async function fetchSharePointItems(config: SharePointConfig): Promise<SharePointItem[]> {
  const { pageSize = DEFAULT_CONFIG.pageSize, selectFields = DEFAULT_CONFIG.selectFields } = config

  const selectClause = selectFields?.join(',') ?? ''
  const initialUrl = `${config.siteUrl}/_api/web/lists/getByTitle('${encodeURIComponent(config.listName)}')/items?` +
    `$select=${selectClause}&` +
    `$top=${pageSize}`

  let allItems: SharePointItem[] = []
  let nextLink: string | null = initialUrl
  let pageCount = 0

  try {
    while (nextLink) {
      pageCount++
      console.log(`[SharePoint] Fetching page ${pageCount} (accumulated: ${allItems.length} items)...`)

      const response = await fetch(nextLink, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(
          `SharePoint API error: ${response.status} ${response.statusText}. ` +
          `Make sure the list name and site URL are correct.`
        )
      }

      const data = await response.json()

      if (data.value && Array.isArray(data.value)) {
        allItems = [...allItems, ...data.value]
        console.log(`[SharePoint] Page ${pageCount}: ${data.value.length} items`)
      }

      // Check for next page
      nextLink = data['@odata.nextLink'] ?? null
    }

    console.log(`[SharePoint] ✅ Total: ${allItems.length} items across ${pageCount} pages`)
    return allItems
  } catch (error) {
    console.error('[SharePoint] ❌ Error fetching items:', error)
    throw error
  }
}

/**
 * Build a SharePoint config from environment or defaults
 * Customize this based on your needs
 */
export function getSharePointConfig(): SharePointConfig {
  return {
    siteUrl: import.meta.env.VITE_SHAREPOINT_SITE_URL ?? 'https://energyregcomm.sharepoint.com/sites/YourSite',
    listName: import.meta.env.VITE_SHAREPOINT_LIST_NAME ?? 'Documents',
    pageSize: 5000,
  }
}
