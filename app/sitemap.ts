import type { MetadataRoute } from 'next';

const listingIds=['lst_whaler','lst_cj7','lst_chris','lst_f100','lst_airstream','lst_bmw','lst_sailboat','lst_panhead','lst_landrover','lst_lathe','lst_external_cl','lst_external_ebay'];

export default function sitemap():MetadataRoute.Sitemap{
  const modified=new Date();
  return [
    {url:'https://zingposts.com',lastModified:modified,changeFrequency:'daily',priority:1},
    ...listingIds.map(id=>({url:`https://zingposts.com/listings/${id}`,lastModified:modified,changeFrequency:'weekly' as const,priority:.7})),
  ];
}
