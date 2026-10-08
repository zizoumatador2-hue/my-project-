import { allArticles, url } from '../lib/content';
export async function GET() {
  const a = await allArticles();
  return new Response(JSON.stringify(a.map((x) => ({ title: x.data.title, description: x.data.description, keyword: x.data.keyword, url: url(x) }))), { headers: { 'Content-Type': 'application/json' } });
}
