'use client';

import { PortfolioDataProvider } from '@ai-portfolio/core';
import type { PortfolioData } from '@ai-portfolio/core';

import config from '@/portfolio/config.json';
import projects from '@/portfolio/projects.json';
import skills from '@/portfolio/skills.json';
import experience from '@/portfolio/experience.json';
import recommendations from '@/portfolio/recommendations.json';

const portfolioData: PortfolioData = {
  config: config as PortfolioData['config'],
  projects: projects as PortfolioData['projects'],
  skills: skills as PortfolioData['skills'],
  experience: experience as PortfolioData['experience'],
  recommendations: recommendations as PortfolioData['recommendations'],
};

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioDataProvider data={portfolioData}>
      {children}
    </PortfolioDataProvider>
  );
}
