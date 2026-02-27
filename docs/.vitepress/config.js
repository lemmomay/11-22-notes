export default {
  title: '11 和 22 的笔记',
  description: '学习笔记与技术分享',
  base: '/11-22-notes/',
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'OpenClaw', link: '/openclaw/' },
      { text: 'Linux', link: '/linux/' },
      { text: '开发', link: '/dev/' }
    ],
    
    sidebar: {
      '/openclaw/': [
        {
          text: 'OpenClaw',
          items: [
            { text: '模型配置指南', link: '/openclaw/model-config' }
          ]
        }
      ]
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/lemmomay/11-22-notes' }
    ]
  }
}
