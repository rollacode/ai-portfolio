export interface PortfolioConfig {
  name: string;
  firstName: string;
  title: string;
  bio: string;
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
}

export interface PortfolioData {
  config: PortfolioConfig;
  projects: Project[];
  skills: SkillsData;
  experience: Experience[];
  recommendations: Recommendation[];
}
