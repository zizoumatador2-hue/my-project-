export interface Category {
  slug: string;
  name: string;
  short: string;
  description: string;
  title: string; // SEO title (<= 60 chars incl. brand suffix added by layout)
  intro: string;
  icon: 'bulb' | 'book' | 'spark' | 'rocket' | 'sliders' | 'gauge' | 'headset' | 'scale' | 'wrench' | 'news';
  /** Categories with no articles yet are kept out of the index. */
  indexable: boolean;
}

export const categories: Category[] = [
  {
    slug: 'gaming-tips',
    name: 'Gaming Tips',
    short: 'Skills & habits',
    title: 'Gaming Tips That Actually Help You Improve',
    description:
      'Practical gaming tips for aim, game sense, practice and mindset — written to help you improve in any game, on any platform.',
    intro:
      'General skills that carry from game to game: how to practice, how to review your play, and how to stop repeating the same mistakes.',
    icon: 'bulb',
    indexable: true,
  },
  {
    slug: 'game-guides',
    name: 'Game Guides',
    short: 'Per-game help',
    title: 'Game Guides: Walkthroughs, Strategy and Setup',
    description:
      'Detailed game guides covering how systems work, what to do first and how to avoid common mistakes in popular games.',
    intro: 'Deep dives on individual games, written around how the game actually works rather than around patch-of-the-week lists.',
    icon: 'book',
    indexable: true,
  },
  {
    slug: 'beginner-guides',
    name: 'Beginner Guides',
    short: 'Start here',
    title: 'Beginner Gaming Guides: Start Here',
    description:
      'Beginner gaming guides that explain the basics clearly: first steps, common mistakes and the habits that help new players improve faster.',
    intro: 'Plain-language starting points for people who are new to a genre, a platform or competitive play.',
    icon: 'spark',
    indexable: true,
  },
  {
    slug: 'advanced-strategies',
    name: 'Advanced Strategies',
    short: 'Level up',
    title: 'Advanced Gaming Strategies and Techniques',
    description:
      'Advanced gaming strategies for players who already know the basics: decision-making, economy, positioning, practice design and review.',
    intro: 'Techniques and mental models for players who have the fundamentals and want a structured way to climb.',
    icon: 'rocket',
    indexable: true,
  },
  {
    slug: 'game-settings',
    name: 'Game Settings',
    short: 'Graphics, sens, audio',
    title: 'Best Game Settings: Graphics, Sensitivity, Controller',
    description:
      'Best game settings explained: graphics, sensitivity, controller, display and audio options, with the reasoning behind each recommendation.',
    intro: 'Settings guides that explain what each option does, so you can tune your own setup instead of copying someone else’s.',
    icon: 'sliders',
    indexable: true,
  },
  {
    slug: 'gaming-performance',
    name: 'Gaming Performance',
    short: 'FPS & input lag',
    title: 'Gaming Performance: Boost FPS, Cut Input Lag',
    description:
      'Gaming performance guides to raise FPS, reduce input lag and optimize Windows and PC hardware without risky tweaks.',
    intro: 'Safe, reversible ways to get smoother frame rates and snappier response from the hardware you already own.',
    icon: 'gauge',
    indexable: true,
  },
  {
    slug: 'gaming-gear',
    name: 'Gaming Gear',
    short: 'Mice, headsets, desks',
    title: 'Gaming Gear Guides: Mice, Headsets, Monitors',
    description:
      'Gaming gear buying guides that explain which specifications matter for mice, headsets, monitors and desk setups, and who each suits.',
    intro: 'Buying guides built around what matters for play, with clear notes on who each type of gear is and isn’t for.',
    icon: 'headset',
    indexable: true,
  },
  {
    slug: 'game-comparisons',
    name: 'Game Comparisons',
    short: 'Versus & choices',
    title: 'Gaming Comparisons: Platforms, Inputs and More',
    description:
      'Fair gaming comparisons: PC vs console, controller vs keyboard and mouse, and other choices explained with trade-offs.',
    intro: 'Side-by-side comparisons that lay out the trade-offs honestly so you can pick what fits how you play.',
    icon: 'scale',
    indexable: true,
  },
  {
    slug: 'troubleshooting',
    name: 'Troubleshooting',
    short: 'Fix problems',
    title: 'Gaming Troubleshooting: Fix Lag, Crashes, Stutter',
    description:
      'Gaming troubleshooting guides for lag, crashes, stutter, connection problems and controller issues, ordered from fastest fix to deepest.',
    intro: 'Step-by-step fixes ordered from quickest check to deepest cause, so you stop guessing.',
    icon: 'wrench',
    indexable: true,
  },
  {
    slug: 'gaming-news',
    name: 'Gaming News',
    short: 'Only what matters',
    title: 'Gaming News That Changes How You Play',
    description:
      'We publish gaming news only when it changes how you play, what you buy or how you configure a game.',
    intro: 'We only publish news when it is useful to players. There is nothing here yet, and we would rather leave it empty than fill it with filler.',
    icon: 'news',
    indexable: false,
  },
];

export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug)!;
