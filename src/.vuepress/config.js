// .vuepress/config.js

module.exports = {
    // Title of your website
    title: 'terassyi',
  
    // Description of your website
    description: 'terassyi pages',
  
    // Language of your website
    locales: {
      '/': {
        lang: 'en-US',
      },
    },
  
    // Theme to use
    theme: 'meteorlxy',
  
    // Theme config
    themeConfig: {
      // Language of this theme. See the [Theme Language] section below.
      lang: 'en-US',
  
      // Personal infomation (delete the fields if you don't have / don't want to display)
      personalInfo: {
        // Nickname
        nickname: 'terassyi',
  
        // Introduction of yourself (HTML supported)
        description: 'Fortune favors the brave',
  
        // Email
        email: 'iscale821@gmail.com',
  
        // Your location
        location: 'Fukuoka City, Japan',
  
        // Your organization
        organization: '',
  
        // Your avatar image
        // Set to external link
        avatar: '/img/avatar.jpg',
        // Or put into `.vuepress/public` directory. E.g. `.vuepress/public/img/avatar.jpg`
        // avatar: '/img/avatar.jpg',
  
        // Accounts of SNS
        sns: {
          // Github account and link
          github: {
            account: 'terassyi',
            link: 'https://github.com/terassyi',
          },
          // Twitter account and link
          twitter: {
            account: 'terassyi',
            link: 'https://twitter.com/terassyi_',
          },
        },
      },

      head: [
        ['link', { rel: 'icon', type: 'image/png', href: '/icon/favicon.png' }],
        ['link', { href: '/css/style.css', rel: 'stylesheet'}],
        ['meta', { name: 'google-site-verification', content: 'gQu0iky_ETYCzFPMKhAKA5OAhPuBQseCX8pMyF7M-8k' }]
      ],
  
      // Header Config (Optional)
      header: {
        // The background of the header. You can choose to use an image, or to use random pattern (geopattern)
        background: {
          // URL of the background image. If you set the URL, the random pattern will not be generated, and the `useGeo` will be ignored.
          url: '/img/bg.jpg',
  
          // Use random pattern. If you set it to `false`, and you don't set the image URL, the background will be blank.
          useGeo: true,
        },
  
        // show title in the header or not
        showTitle: true,
      },
  
      // Footer Config (Optional)
      footer: {
        // Show 'Powered by VuePress' or not (enable it to support VuePress)
        poweredBy: true,
  
        // Show the theme that you are using (enable it to support this theme) (please do not disable it, haha)
        poweredByTheme: true,
  
        // Add your custom footer (HTML supported)
        custom: 'Copyright 2018-present <a href="https://github.com/meteorlxy" target="_blank">meteorlxy</a> | MIT License',
      },
  
      // Info Card Config (Optional)
      infoCard: {
        // The background of the info card's header. You can choose to use an image, or to use random pattern (geopattern)
        headerBackground: {
          // URL of the background image. If you set the URL, the random pattern will not be generated, and the `useGeo` will be ignored.
          url: '/img/bg.jpg',
  
          // Use random pattern. If you set it to `false`, and you don't set the image URL, the background will be blank.
          useGeo: true,
        },
      },
  
      // Show the last updated time of your posts
      lastUpdated: true,
  
      // The content of your navbar links
      nav: [
        { text: 'Home', link: '/', exact: true },
        { text: 'Posts', link: '/posts/', exact: false },
        { text: 'About', link: '/about/', exact: false },
      ],

      sidebar: [
        '/',
        '/about/'
      ],
      sidebarDepth: 2,
  
      // Comments config. See the [Posts Comments] section below.
      // comments: {
      //   owner: 'terassyi',
      //   repo: 'portfolio',
      //   clientId: 'MY_CLIENT_ID',
      //   clientSecret: 'MY_CLIENT_SECRET',
      // },
  
      // Pagination config (Optional)
      pagination: {
        perPage: 5,
      },
  
      // Default Pages (Optional, the default value of all pages is `true`)
      defaultPages: {
        // Allow theme to add Home page (url: /)
        home: true,
        // Allow theme to add Posts page (url: /posts/)
        posts: true,

        about: true,
      },
    },

    markdown: {
      lineNumbers: true
    },

    plugins: {
      '@vuepress/google-analytics': {'ga': 'UA-151191455-1'},
      'seo': {
        title: ($page, $site) => $page.title || $site.title,
        description: $page => $page.frontmatter.description,
        twitterCard: _ => 'summary_large_image',
        image: ($page, $site) => $page.frontmatter.image && (($site.themeConfig.domain || '') + $page.frontmatter.image),
      },
      'sitemap': { 
        hostname: 'https://terassyi.net',
        changefreq: "weekly"
      },
    }
  }
