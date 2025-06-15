import { Client } from '@notionhq/client'

// 简化的环境变量获取
const NOTION_TOKEN = process.env.VITE_NOTION_TOKEN || import.meta.env.VITE_NOTION_TOKEN || process.env.NOTION_TOKEN || import.meta.env.NOTION_TOKEN
const NOTION_DATABASE_ID = process.env.VITE_NOTION_DATABASE_ID || import.meta.env.VITE_NOTION_DATABASE_ID || process.env.NOTION_DATABASE_ID || import.meta.env.NOTION_DATABASE_ID

// 添加调试日志
console.log('Environment check:')
console.log('NOTION_TOKEN exists:', !!NOTION_TOKEN)
console.log('NOTION_DATABASE_ID exists:', !!NOTION_DATABASE_ID)
console.log('NOTION_TOKEN length:', NOTION_TOKEN ? NOTION_TOKEN.length : 0)

if (!NOTION_TOKEN) {
  throw new Error('NOTION_TOKEN is not set')
}

if (!NOTION_DATABASE_ID) {
  throw new Error('NOTION_DATABASE_ID is not set')
}

const notion = new Client({
  auth: NOTION_TOKEN,
})

async function getBlogPosts() {
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
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
    id: post.id,
    title: post.properties.Name.title[0]?.plain_text || '未命名',
    slug: post.properties.Slug.rich_text[0]?.plain_text || 'no-slug',
    date: post.properties.Date.date?.start || '',
    summary: post.properties.Summary.rich_text[0]?.plain_text || '',
    coverImage: post.properties['Cover Image']?.url || null,
  }))
}

async function getBlogPost(slug) {
  // 先根據 slug 找到文章
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
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
const defaultCoverImage = 'https://deoheal.com/home2.png'
  return {
    id: pageId,
    title: post.properties.Name.title[0]?.plain_text || '未命名',
    slug: post.properties.Slug.rich_text[0]?.plain_text || 'no-slug',
    date: post.properties.Date.date?.start || '',
    summary: post.properties.Summary.rich_text[0]?.plain_text || '',
    content: pageContent.markdown,
    contentHtml: pageContent.html,
    coverImage: post.properties['Cover Image']?.url || null,
    metaDescription: post.properties.Summary.rich_text[0]?.plain_text || '',
  }
}

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
      console.log(`未處理的區塊類型: ${type}`)
      break
  }

  return { markdown, html }
}

function extractTextFromRichText(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return ''
  }

  return richTextArray.map(item => item.plain_text || '').join('')
}

function convertInlineStyles(text) {
  return text
}

export { getBlogPosts, getBlogPost }