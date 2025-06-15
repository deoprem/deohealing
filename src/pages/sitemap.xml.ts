import type { APIRoute } from 'astro'
import { getBlogPosts } from '../../lib/notion.js'

export const GET: APIRoute = async () => {
  const posts = await getBlogPosts()

  const urls = posts.map((post) => {
    return `
      <url>
        <loc>https://deoheal.com/blog/${post.slug}</loc>
        <lastmod>${new Date(post.date).toISOString()}</lastmod>
      </url>
    `
  }).join('')

  return new Response(
    `<?xml version="1.0" encoding="UTF-8" ?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`.trim(),
    {
      headers: {
        'Content-Type': 'application/xml',
      },
    }
  )
}