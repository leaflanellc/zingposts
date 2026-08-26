import type { MetadataRoute } from 'next';

export default function robots():MetadataRoute.Robots{
  return {rules:{userAgent:'*',allow:['/','/listings/'],disallow:['/boards/','/alerts/','/messages/','/trade-rooms/','/workbench/','/activity','/agents']},sitemap:'https://zingposts.com/sitemap.xml',host:'https://zingposts.com'};
}
