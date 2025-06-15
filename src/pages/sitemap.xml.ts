import fs from 'fs'
import path from 'path'
import type { APIRoute } from 'astro'
import { getBlogPosts } from '../lib/notion.js'

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
      !file.includes('sitemap') && // 避免抓自己
      !file.includes('404')        // 避免 404 頁
    )
    .map((file) => {
      const name = file === 'index.astro' ? '' : file.replace('.astro', '')
      return {
        loc: `https://deoheal.com/${name}`,
        lastmod: new Date().toISOString(), // 可改成每頁自己的更新時間
      }
    })

  const blogPages = posts.map((post) => ({
    loc: `https://deoheal.com/blog/${post.slug}`,
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