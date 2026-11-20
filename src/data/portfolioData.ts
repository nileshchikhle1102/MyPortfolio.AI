export interface PortfolioMetric {
  value: string;
  label: string;
  context: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  period: string;
  summary: string;
  highlights: string[];
  stack: string[];
}

export interface CredentialItem {
  id: string;
  kind: 'Education' | 'Certification' | 'Recognition';
  title: string;
  issuer: string;
  period: string;
  highlight: string;
  details: string;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface FeaturedProject {
  id: string;
  title: string;
  tagline: string;
  category: 'Full-Stack' | 'Frontend' | 'Backend' | 'Enterprise';
  year: string;
  description: string;
  architectureHighlights: string[];
  stack: string[];
  coverImage: string;
  githubRepo?: string;
  githubUrl?: string;
  liveUrl?: string;
  featured?: boolean;
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  private: boolean;
  topics: string[];
}

export const PROFILE = {
  name: 'Nilesh Chikhle',
  githubUsername: 'nileshchikhle1102',
  role: 'Senior Software Engineer · Full Stack Development & API Architecture',
  availability: 'Immediate Joiner · Open to New Opportunities',
  headline: 'Architecting scalable full-stack web apps, REST APIs & enterprise CRM platforms.',
  bio: 'Senior Software Engineer (Immediate Joiner) with 5 years of experience architecting full-stack web applications, scalable REST APIs, and enterprise CRM solutions across the BFSI domain using React.js, Node.js, PHP, and SQL. Proven track record leading a 4-developer team, driving legacy-to-modern migrations, optimizing multi-database performance (MySQL, SQL Server, Oracle), and delivering 20+ enterprise implementations, third-party API integrations, and generative AI workflows.',
  aboutExtended:
    'Over 5 years at SimpleWorks Solutions Pvt. Ltd. (Nov 2021 – Oct 2026), I grew from Software Developer to Senior Software Engineer—delivering 20+ BFSI CRM customizations, modernizing 50–60% of legacy modules into decoupled React.js and Node.js services, and leading a 4-engineer team. Currently exploring my next senior engineering role in full-stack development, API architecture, enterprise integration, or AI-powered product engineering.',
  location: 'Nagpur, Maharashtra, India',
  email: 'nilesh.chikhle.career@gmail.com',
  secondaryEmail: 'chikhlenilesh@gmail.com',
  phone: '+91 8208654908',
  githubUrl: 'https://github.com/nileshchikhle1102',
  linkedinUrl: 'https://www.linkedin.com/in/nileshchikhle/',
  portfolioUrl: 'https://nileshchikhle1102.github.io/myportfolio/',
  portraitImage: '/src/assets/images/nilesh_profile.png',
  studioImage: '/src/assets/images/hero_studio_desk_1795158927015.jpg',
};

export const PROOF_METRICS: PortfolioMetric[] = [
  {
    value: '5 Years',
    label: 'Full-Stack & API Experience',
    context: 'BFSI & enterprise CRM systems with React.js, Node.js, PHP & SQL',
  },
  {
    value: '20+ Live',
    label: 'Enterprise Implementations',
    context: 'Compliance-ready BFSI workflows, RBAC & third-party API integrations',
  },
  {
    value: '50–60%',
    label: 'Legacy CRM Modernized',
    context: 'Migrated into modular React.js frontends & Node.js backend services',
  },
  {
    value: '4 Devs',
    label: 'Engineering Team Led',
    context: 'Sprint planning, architecture guidance, debugging & GitHub PR reviews',
  },
];

export const FEATURED_PROJECTS: FeaturedProject[] = [
  {
    id: 'resumeiq-ai',
    title: 'ResumeIQ AI',
    tagline: 'AI-powered resume builder, live ATS scoring & print-ready PDF studio',
    category: 'Full-Stack',
    year: '2026',
    featured: true,
    description:
      'A responsive web and mobile resume builder pairing a live multi-template editor with semantic Applicant Tracking System (ATS) scoring, job description alignment, Gmail authentication, Firestore real-time sync, and Stripe subscriptions.',
    architectureHighlights: [
      'Server-side ATS evaluation with automatic retry & model failover resilience plus an offline deterministic scoring engine.',
      'Vector text @media print engine across Modern Precision, Classic Executive, and Compact Technical PDF layouts.',
      'Real-time Firestore persistence with hardened security rules, 72-hour server-verified trial, and Stripe Checkout.',
    ],
    stack: ['TypeScript', 'React', 'Node.js', 'Express', 'Firestore', 'Stripe', 'Gemini AI'],
    coverImage: '/src/assets/images/cover_interface_craft_1795158945160.jpg',
    githubRepo: 'nileshchikhle1102/resumeiq-ai',
    githubUrl: 'https://github.com/nileshchikhle1102/resumeiq-ai',
  },
  {
    id: 'mulesoft-oracle-integration',
    title: 'MuleSoft API & Oracle Database Integration',
    tagline: 'RESTful Mule 4 flows with DataWeave 2.0 & parameterized Oracle CRUD',
    category: 'Backend',
    year: '2026',
    description:
      'Independent enterprise integration project implementing RESTful HTTP listener flows in Mule 4 (Anypoint Studio) with DataWeave 2.0 payload transformations and parameterized Oracle Database Connector operations.',
    architectureHighlights: [
      'Designed RAML / APIkit-aligned REST endpoints executing parameterized Oracle SELECT, INSERT, and UPDATE operations.',
      'Built reusable DataWeave 2.0 transformations for clean request validation and structured JSON responses.',
      'Validated end-to-end API behavior, error handling, and SQL execution using Postman and cURL test suites.',
    ],
    stack: ['MuleSoft (Mule 4)', 'Anypoint Studio', 'DataWeave 2.0', 'RAML', 'Oracle DB', 'Postman'],
    coverImage: '/src/assets/images/cover_distributed_network_1795158927120.jpg',
    githubRepo: 'nileshchikhle1102/mule-learning',
    githubUrl: 'https://github.com/nileshchikhle1102/mule-learning',
  },
  {
    id: 'crm-modernization',
    title: 'Enterprise BFSI CRM Modernization & Integrations',
    tagline: '20+ BFSI deployments, 50–60% legacy migration & omnichannel API connectors',
    category: 'Enterprise',
    year: '2021 – 2026',
    description:
      'Led full-stack modernization and enterprise integration work across BFSI clients at SimpleWorks Solutions—migrating 50–60% of legacy SuiteCRM/SimpleCRM modules to modular React.js and Node.js while building secure omnichannel API integrations.',
    architectureHighlights: [
      'Integrated Meta WhatsApp, Gupshup SMS/WhatsApp, Google Calendar, and Microsoft 365 via Microsoft Entra ID (Azure AD) and Microsoft Graph API for inbound/outbound email routing and bi-directional calendar sync.',
      'Developed custom V8 REST APIs, automated logic hooks, data deduplication engines, and granular RBAC aligned with BFSI data security standards.',
      'Optimized complex SQL queries and financial/CRM reporting pipelines across MySQL, Microsoft SQL Server, and Oracle.',
    ],
    stack: ['React.js', 'Node.js', 'PHP MVC', 'SuiteCRM', 'Microsoft Graph API', 'MySQL', 'SQL Server', 'Oracle'],
    coverImage: '/src/assets/images/hero_studio_desk_1795158927015.jpg',
  },
  {
    id: 'green-room',
    title: 'Greenroom',
    tagline: 'Resume-driven spoken interview rehearsal & fixed-rubric scoring',
    category: 'Full-Stack',
    year: '2026',
    description:
      'Upload a resume, answer tailored technical questions aloud, and receive structured rubric evaluations on how convincingly you defend your own work. Built with a single cross-platform Expo codebase for iOS, Android, and Web backed by Node.js, Express, and MongoDB.',
    architectureHighlights: [
      'Server-authoritative architecture: prompts, rubrics, and scoring rules live strictly on the backend for instant tuning without binary releases.',
      'Versioned /api/v1 contract with remote feature flags and minimum supported app version checks.',
      'Cross-platform Expo client focused cleanly on audio capture, live meters, and low-latency transcript display.',
    ],
    stack: ['JavaScript', 'Node.js', 'Express', 'MongoDB', 'Expo', 'React Native'],
    coverImage: '/src/assets/images/cover_systems_architecture_1795158926386.jpg',
    githubRepo: 'nileshchikhle1102/green-room',
    githubUrl: 'https://github.com/nileshchikhle1102/green-room',
  },
  {
    id: 'profile-viewer',
    title: 'GitHub Profile Viewer',
    tagline: 'Shareable developer ID-badge lookup with provider adapter architecture',
    category: 'Frontend',
    year: '2026',
    description:
      'A React application that looks up any public GitHub profile and renders it as a clean, shareable ID-badge record with linked social accounts, URL-synced queries (?u=<handle>), recent search history, and a live hourly API rate-limit readout.',
    architectureHighlights: [
      'Decoupled provider adapter registry (providers/githubProvider.js) so additional platforms can be added without modifying UI components.',
      'Live GitHub response-header inspection exposing remaining hourly API quota and distinct error recovery copy.',
      'Shareable deep-link query params with localStorage recent lookup persistence and responsive light/dark themes.',
    ],
    stack: ['React 18', 'JavaScript', 'Axios', 'GitHub REST API', 'CSS'],
    coverImage: '/src/assets/images/project_profile_viewer.png',
    githubRepo: 'nileshchikhle1102/profile-viewer',
    githubUrl: 'https://github.com/nileshchikhle1102/profile-viewer',
    liveUrl: 'https://nileshchikhle1102.github.io/profile-viewer/',
  },
];

export const EXPERIENCES: ExperienceItem[] = [
  {
    id: 'simpleworks-senior',
    role: 'Senior Software Engineer',
    company: 'SimpleWorks Solutions Pvt. Ltd.',
    location: 'Nagpur, India',
    period: 'May 2026 – Oct 2026',
    summary:
      'Led a 4-developer engineering team architecting full-stack features, SuiteCRM platform upgrades, and production REST APIs for enterprise and BFSI clients (concluded tenure Oct 30, 2026).',
    highlights: [
      'Architected and developed full-stack features, reusable product enhancements, and REST APIs using React.js, Node.js, and PHP for enterprise and BFSI clients.',
      'Led and mentored 4 developers via sprint task allocation, technical guidance, debugging, and GitHub PR reviews.',
      'Spearheaded SuiteCRM upgrades and architectural compatibility across custom modules, logic hooks, and API layers while supporting quarterly roadmap planning.',
      'Diagnosed and resolved high-priority production API bottlenecks, database performance issues, and enterprise email/client incidents.',
    ],
    stack: ['React.js', 'Node.js', 'PHP', 'SuiteCRM', 'REST APIs', 'MySQL', 'SQL Server', 'Oracle', 'Team Leadership'],
  },
  {
    id: 'simpleworks-dev',
    role: 'Software Developer',
    company: 'SimpleWorks Solutions Pvt. Ltd.',
    location: 'Nagpur, India',
    period: 'Nov 2021 – Apr 2026',
    summary:
      'Delivered 20+ enterprise BFSI CRM implementations, modernized 50–60% of legacy modules into React.js and Node.js, and built mission-critical third-party API integrations.',
    highlights: [
      'Delivered 20+ enterprise CRM customizations across BFSI clients, building secure onboarding workflows and compliance-ready data handling using PHP, JavaScript, REST APIs, and relational databases.',
      'Engineered modular React.js frontends and Node.js backend services in a 4-person team to modernize and migrate 50–60% of legacy CRM modules into a decoupled stack.',
      'Built third-party integrations for Meta WhatsApp, Gupshup SMS/WhatsApp, Google Calendar, and Microsoft 365, configuring Microsoft Entra ID (Azure AD) app registrations and Microsoft Graph API permissions for inbound/outbound email routing and bi-directional calendar sync.',
      'Developed custom V8 REST APIs, automated logic hooks, data deduplication engines, and granular role-based access controls (RBAC) aligned with BFSI data security standards.',
      'Optimized complex SQL queries and financial/CRM reporting pipelines across MySQL, SQL Server, and Oracle, improving query execution and production stability.',
    ],
    stack: ['JavaScript (ES6+)', 'React.js', 'Node.js', 'PHP MVC', 'OAuth 2.0', 'Microsoft Graph API', 'RBAC', 'SQL'],
  },
];

export const SKILL_GROUPS: SkillGroup[] = [
  {
    category: 'Languages',
    items: ['JavaScript (ES6+)', 'TypeScript', 'PHP', 'SQL', 'HTML5', 'CSS3'],
  },
  {
    category: 'Frontend',
    items: ['React.js', 'Redux', 'React Query', 'Zustand', 'Material UI', 'Tailwind CSS'],
  },
  {
    category: 'Backend & APIs',
    items: [
      'Node.js',
      'Express.js',
      'PHP MVC',
      'RESTful APIs',
      'Microservices',
      'OAuth 2.0',
      'JWT',
      'Microsoft Graph API',
    ],
  },
  {
    category: 'Databases',
    items: ['MySQL', 'Microsoft SQL Server', 'Oracle', 'MongoDB', 'Firebase Firestore'],
  },
  {
    category: 'Cloud & DevOps',
    items: ['AWS S3', 'Docker', 'CI/CD', 'GitHub Actions', 'Microsoft Entra ID (Azure AD) App Registration'],
  },
  {
    category: 'Enterprise Platforms & Integration',
    items: [
      'SuiteCRM',
      'SimpleCRM (Custom Modules, Logic Hooks, V8 APIs, RBAC)',
      'MuleSoft (Mule 4, Anypoint Studio, DataWeave 2.0, RAML, APIkit)',
    ],
  },
  {
    category: 'AI & Productivity Tools',
    items: [
      'Claude',
      'Gemini',
      'ChatGPT',
      'Custom Knowledge Base / Website Data Grounding',
      'Prompt Engineering',
    ],
  },
  {
    category: 'Tools & Practices',
    items: ['Git', 'GitHub', 'Jira', 'Postman', 'SQL Query Optimization', 'Code Review', 'Agile'],
  },
];

export const CREDENTIALS: CredentialItem[] = [
  {
    id: 'ghru-btech',
    kind: 'Education',
    title: 'Bachelor of Technology (B.Tech)',
    issuer: 'G.H. Raisoni University',
    period: '2021',
    highlight: 'Computer Science',
    details:
      'Strong foundation in Data Structures, Algorithms, Object-Oriented Programming, Database Management Systems, Web Development, and Software Engineering.',
  },
  {
    id: 'gcp-genai-leader',
    kind: 'Certification',
    title: 'Be a Generative AI Leader',
    issuer: 'Google Cloud Certification',
    period: 'Completed Oct 2026',
    highlight: 'Verified Credential',
    details:
      'Validated fluency in enterprise generative AI strategy, LLM grounding, responsible AI governance, and designing production AI-assisted workflows.',
  },
  {
    id: 'shining-star',
    kind: 'Recognition',
    title: 'Shining Star Award',
    issuer: 'SimpleWorks Solutions Pvt. Ltd.',
    period: 'Enterprise Delivery',
    highlight: 'Performance Award',
    details:
      'Recognized for high-impact enterprise BFSI CRM deliveries, legacy-to-modern architectural leadership, and dependable production incident resolution.',
  },
];
