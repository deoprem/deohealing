import type { APIRoute } from 'astro'
import { getBlogPosts } from '../lib/notion.js'

export const GET: APIRoute = async () => {
  const posts = await getBlogPosts()

  // 靜態頁面（你可以依網站實際內容修改）
  const staticPages = [
    {
      loc: 'https://deoheal.com/',
      lastmod: '2025-06-15',
    },
    {
      loc: 'https://deoheal.com/aboutdeo',
      lastmod: '2025-06-15',
    },
    {
      loc: 'https://deoheal.com/contact',
      lastmod: '2025-06-15',
    },
    {
      loc: 'https://deoheal.com/services',
      lastmod: '2025-06-15',
    },
    {
      loc: 'https://deoheal.com/courses/',
      lastmod: '2025-06-15',
    },
    {
      loc: 'https://deoheal.com/blog/',
      lastmod: '2025-06-15',
    },
  ]

  const staticUrls = staticPages
    .map(
      (page) => `
      <url>
        <loc>${page.loc}</loc>
        <lastmod>${page.lastmod}</lastmod>
      </url>`
    )
    .join('')

  const blogUrls = posts
    .map(
      (post) => `
      <url>
        <loc>https://deoheal.com/blog/${post.slug}</loc>
        <lastmod>${new Date(post.date).toISOString()}</lastmod>
      </url>`
    )
    .join('')

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${staticUrls}
      ${blogUrls}
    </urlset>`.trim(),
    {
      headers: {
        'Content-Type': 'application/xml',
      },
    }
  )
}