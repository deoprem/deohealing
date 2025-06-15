import fs from 'fs'
import path from 'path'
import type { APIRoute } from 'astro'
import { getBlogPosts } from '../lib/notion.js'
import he from 'he' // HTML entity encoder

export const GET: APIRoute = async () => {
  const posts = await getBlogPosts()

  // 自動抓取 src/pages/*.astro 靜態頁面
  const pagesDir = path.resolve('./src/pages')
  const files = fs.readdirSync(pagesDir)

  const staticPages = files
    .filter((file) =>
      file.endsWith('.astro') &&
      !file.startsWith('[') &&
      !file.startsWith('_') &&
      !file.includes('sitemap') &&
      !file.includes('404')
    )
    .map((file) => {
      const name = file === 'index.astro' ? '' : file.replace('.astro', '')
      return {
        loc: `https://deoheal.com/${he.encode(name)}`, // encode 靜態頁面網址
        lastmod: new Date().toISOString(),
      }
    })

  const blogPages = posts.map((post) => ({
    loc: `https://deoheal.com/blog/${he.encode(post.slug)}`, // encode slug 防止注入
    lastmod: new Date(post.date).toISOString(),
  }))

  const allPages = [...staticPages, ...blogPages]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allPages
    .map(
      (page) => `
    <url>
      <loc>${page.loc}</loc>
      <lastmod>${page.lastmod}</lastmod>
    </url>`
    )
    .join('')}
</urlset>`

  return new Response(sitemap.trim(), {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}