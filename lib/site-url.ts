import 'server-only';

export const PRODUCTION_SITE_ORIGIN='https://zingposts.com';

export function publicSiteOrigin(request:Request){
  const configured=process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if(configured)return new URL(configured).origin;
  if(process.env.NODE_ENV==='production')return PRODUCTION_SITE_ORIGIN;
  return new URL(request.url).origin;
}

export function authCallbackUrl(request:Request){
  return new URL('/auth/callback',publicSiteOrigin(request)).toString();
}
