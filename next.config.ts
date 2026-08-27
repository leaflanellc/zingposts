import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  headers(){
    const privateAgentGuideHeaders=[
      {key:'Cache-Control',value:'no-store'},
      {key:'Referrer-Policy',value:'no-referrer'},
    ];
    return [
      {source:'/for-agents',headers:privateAgentGuideHeaders},
      {source:'/api/agent-guide',headers:privateAgentGuideHeaders},
    ];
  },
};

export default nextConfig;
