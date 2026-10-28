export interface PortfolioConfig {
  name: string;
  firstName: string;
  title: string;
  bio: string;
  experienceYears?: number;
  location: string;
  workModes: string[];
  avatar: string | null;
  languages: Array<{ language: string; level: string }>;
  education: {
    university: string;
    degree: string;
    period: string;
  };
  strengths: Array<{ title: string; description: string }>;
  suggestedQuestions: string[];
  social: {
    github: string;
    linkedin: string;
    email: string;
  };
  theme: {
    accent: string;
    darkBg: string;
    lightBg: string;
  };
  agent: {
    greeting: string;
    personality: string;
  };
  partner?: {
    name: string;
    role: string;
    url: string;
    description: string;
  };
  /** A product the site owner wants to show off; the agent gets a show_spotlight tool only when this is set. */
  spotlight?: Spotlight;
}

export interface ProjectLoopMedia {
  mp4: string;
  webm?: string;
  poster: string;
}

export interface Spotlight {
  loop?: ProjectLoopMedia;
  name: string;
  tagline: string;
  summary: string;
  video?: { mp4: string; webm?: string; poster?: string };
  /** One story that proves the product, told in a sentence or two rather than as a stats grid. */
  proof?: { title: string; body: string };
  differences: Array<{ title: string; body: string }>;
  capabilities: Array<{ title: string; body: string }>;
  openSource?: string;
  links: { website: string; download?: string; source?: string };
}

export interface Skill {
  id: string;
  name: string;
  years?: number;
  level: string;
}

export interface SkillsData {
  primary: Skill[];
  strong: Skill[];
  ai: Skill[];
  working: Skill[];
  hobby: Skill[];
}

export interface Project {
  loop?: ProjectLoopMedia;
  slug: string;
  name: string;
  role: string;
  stack: string[];
  period: string;
  screenshots: string[];
  description: string;
  highlights: string[];
  links: Record<string, string>;
  skillIds: string[];
  writeup?: string;
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  location: string;
  description: string;
  highlights: string[];
  stack: string[];
}

export interface Recommendation {
  name: string;
  title: string;
  date: string;
  relation: string;
  company: string;
  projectSlugs: string[];
  text: string;
  /** The recommender's LinkedIn profile. */
  linkedin?: string;
  /** Public path of the recommender's photo. */
  photo?: string;
  /** A verbatim sentence from `text`, short enough for a social proof card. */
  highlight?: string;
  /** How the recommender knows the owner, e.g. "Managed Andrey at Trax Retail". */
  byline?: string;
}

export interface PortfolioData {
  config: PortfolioConfig;
  projects: Project[];
  skills: SkillsData;
  experience: Experience[];
  recommendations: Recommendation[];
}
