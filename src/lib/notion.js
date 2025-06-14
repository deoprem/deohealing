import { Client } from '@notionhq/client'

const notion = new Client({
  auth: import.meta.env.NOTION_TOKEN,
})

async function getBlogPosts() {
  const databaseId = import.meta.env.NOTION_DATABASE_ID

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Published',
      checkbox: { equals: true },
    },
    sorts: [
      {
        property: 'Date',
        direction: 'descending',
      },
    ],
  })

  return response.results.map((post) => ({
    id: post.id, // 頁面 ID，用來抓取內容
    title: post.properties.Name.title[0]?.plain_text || '未命名',
    slug: post.properties.Slug.rich_text[0]?.plain_text || 'no-slug',
    date: post.properties.Date.date?.start || '',
    summary: post.properties.Summary.rich_text[0]?.plain_text || '',
    // 如果有封面圖片的話
    coverImage: post.properties['Cover Image']?.files[0]?.file?.url || 
                post.properties['Cover Image']?.files[0]?.external?.url || null,
  }))
}

// 獲取單篇文章內容 - 從頁面內容讀取
async function getBlogPost(slug) {
  const databaseId = import.meta.env.NOTION_DATABASE_ID

  // 先根據 slug 找到文章
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: 'Published',
          checkbox: { equals: true },
        },
        {
          property: 'Slug',
          rich_text: { equals: slug },
        },
      ],
    },
  })

  if (response.results.length === 0) {
    return null
  }

  const post = response.results[0]
  const pageId = post.id

  // 獲取頁面內容
  const pageContent = await getNotionPageContent(pageId)

  return {
    id: pageId,
    title: post.properties.Name.title[0]?.plain_text || '未命名',
    slug: post.properties.Slug.rich_text[0]?.plain_text || 'no-slug',
    date: post.properties.Date.date?.start || '',
    summary: post.properties.Summary.rich_text[0]?.plain_text || '',
    content: pageContent.markdown,
    contentHtml: pageContent.html,
    coverImage: post.properties['Cover Image']?.files[0]?.file?.url || 
                post.properties['Cover Image']?.files[0]?.external?.url || null,
    metaDescription: post.properties.Summary.rich_text[0]?.plain_text || '',
  }
}

// 獲取 Notion 頁面內容並轉換為 HTML
async function getNotionPageContent(pageId) {
  try {
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
    })

    let markdown = ''
    let html = ''

    for (const block of blocks.results) {
      const { markdown: blockMarkdown, html: blockHtml } = processNotionBlock(block)
      markdown += blockMarkdown + '\n'
      html += blockHtml + '\n'
    }

    return {
      markdown: markdown.trim(),
      html: html.trim()
    }
  } catch (error) {
    console.error('Error fetching page content:', error)
    return {
      markdown: '',
      html: '<p>無法載入文章內容</p>'
    }
  }
}

// 處理 Notion 區塊
function processNotionBlock(block) {
  const type = block.type
  let markdown = ''
  let html = ''

  switch (type) {
    case 'paragraph':
      const paragraphText = extractTextFromRichText(block.paragraph.rich_text)
      if (paragraphText.trim()) {
        markdown = paragraphText
        html = `<p>${convertInlineStyles(paragraphText)}</p>`
      }
      break
      
    case 'heading_1':
      const h1Text = extractTextFromRichText(block.heading_1.rich_text)
      markdown = `# ${h1Text}`
      html = `<h1>${convertInlineStyles(h1Text)}</h1>`
      break
      
    case 'heading_2':
      const h2Text = extractTextFromRichText(block.heading_2.rich_text)
      markdown = `## ${h2Text}`
      html = `<h2>${convertInlineStyles(h2Text)}</h2>`
      break
      
    case 'heading_3':
      const h3Text = extractTextFromRichText(block.heading_3.rich_text)
      markdown = `### ${h3Text}`
      html = `<h3>${convertInlineStyles(h3Text)}</h3>`
      break
      
    case 'bulleted_list_item':
      const bulletText = extractTextFromRichText(block.bulleted_list_item.rich_text)
      markdown = `- ${bulletText}`
      html = `<li>${convertInlineStyles(bulletText)}</li>`
      break
      
    case 'numbered_list_item':
      const numberedText = extractTextFromRichText(block.numbered_list_item.rich_text)
      markdown = `1. ${numberedText}`
      html = `<li>${convertInlineStyles(numberedText)}</li>`
      break
      
    case 'quote':
      const quoteText = extractTextFromRichText(block.quote.rich_text)
      markdown = `> ${quoteText}`
      html = `<blockquote><p>${convertInlineStyles(quoteText)}</p></blockquote>`
      break
      
    case 'code':
      const codeText = extractTextFromRichText(block.code.rich_text)
      const language = block.code.language || ''
      markdown = `\`\`\`${language}\n${codeText}\n\`\`\``
      html = `<pre><code class="language-${language}">${codeText}</code></pre>`
      break
      
    case 'image':
      const imageUrl = block.image.file?.url || block.image.external?.url || ''
      const caption = block.image.caption ? extractTextFromRichText(block.image.caption) : ''
      markdown = `![${caption}](${imageUrl})`
      html = `<img src="${imageUrl}" alt="${caption}" style="max-width: 100%; height: auto;" />`
      if (caption) {
        html += `<p class="image-caption" style="text-align: center; font-style: italic; margin-top: 8px;">${caption}</p>`
      }
      break
      
    default:
      // 對於未處理的區塊類型，嘗試提取文字
      console.log(`未處理的區塊類型: ${type}`)
      break
  }

  return { markdown, html }
}

// 從 rich_text 陣列中提取純文字
function extractTextFromRichText(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return ''
  }

  return richTextArray.map(item => item.plain_text || '').join('')
}

// 轉換行內樣式（粗體、斜體等）
function convertInlineStyles(text) {
  // 這裡可以根據需要擴展更多樣式轉換
  // 目前保持簡單，後續可以根據 rich_text 的 annotations 來處理樣式
  return text
}

// Export 函數
export { getBlogPosts, getBlogPost }