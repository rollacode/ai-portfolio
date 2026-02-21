// Agent tool definitions in OpenAI function calling format
// Two layers: Panel tools (open/close UI) and Action tools (interact within panels)

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ToolName =
  | 'show_project'
  | 'show_projects'
  | 'show_skills'
  | 'show_contact'
  | 'show_timeline'
  | 'show_gallery'
  | 'show_resume'
  | 'hide_panel'
  | 'scroll_timeline_to'
  | 'highlight_period'
  | 'focus_screenshot'
  | 'highlight_skill'
  | 'highlight_project_detail'
  | 'compare_projects'
  | 'scroll_to_project'
  | 'highlight_project'
  | 'show_tech_radar'
  | 'focus_radar_section'
  | 'show_quick_facts'
  | 'show_recommendations'
  | 'highlight_recommendation'
  | 'remember_visitor'
  | 'set_theme'
  | 'play_game'
  | 'show_insight'
  | 'start_showtime';

export interface ToolCall {
  name: ToolName;
  arguments: Record<string, unknown>;
}

interface ToolFunctionParameters {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
  }>;
  required?: string[];
}

interface ToolDefinition {
  type: 'function';
  function: {
    name: ToolName;
    description: string;
    parameters: ToolFunctionParameters;
  };
}

// -----------------------------------------------------------------------------
// Tool definitions
// -----------------------------------------------------------------------------

export const tools: ToolDefinition[] = [
  // ---------------------------------------------------------------------------
  // Layer 1 — Panel tools (open/close UI panels)
  // ---------------------------------------------------------------------------
  {
    type: 'function',
    function: {
      name: 'show_project',
      description:
        'Open a project card in the side panel. Use when the user asks about a specific project, or when you want to visually showcase a project while talking about it.',
      parameters: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'URL-safe project identifier (e.g. "trax-retail", "scan-mania")',
          },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_projects',
      description:
        'Open the projects timeline panel showing ALL projects as a scrollable vertical timeline. Use when the user asks to see all projects, multiple projects, or wants an overview of the portfolio. Prefer this over show_project when showing more than one project.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter projects by theme/category. Options: "ai" (AI/LLM projects), "mobile" (iOS/mobile), "web" (web apps), "ar" (AR/computer vision). Omit to show all.',
            enum: ['all', 'ai', 'mobile', 'web', 'ar'],
          },
          skillId: {
            type: 'string',
            description: 'Filter to only show projects that use this skill ID (e.g. "swift-ios", "langchain"). Omit to show all.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_skills',
      description:
        'Open the skills grid panel. Use when the user asks about technical skills, tech stack, or what technologies the developer knows. Optionally filter by category.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter skills by category. Omit or use "all" to show everything.',
            enum: ['all', 'primary', 'strong', 'ai', 'working'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_contact',
      description:
        'Open the contact info panel with email, GitHub, LinkedIn. Use when the user wants to get in touch, hire, or reach out to the developer.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_timeline',
      description:
        'Open the career timeline panel showing work history chronologically. Use when the user asks about career path, work history, experience, or "where has he worked".',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_gallery',
      description:
        'Open a fullscreen screenshot gallery for a project. Use when the user wants to see screenshots, visuals, or the UI of a specific project.',
      parameters: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'Project slug to show screenshots for (e.g. "scan-mania")',
          },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_resume',
      description:
        'Open the resume/CV panel. Use when the user asks for a resume, CV, or wants to download it. The panel has PDF and Markdown download buttons built in.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_tech_radar',
      description:
        'Open an interactive tech radar visualization showing all skills as a concentric ring chart. Expert skills are in the center, working knowledge on the outside. Use when the user asks about the tech stack overview, skill levels, or wants a visual summary of technical expertise.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'focus_radar_section',
      description:
        'Zoom into a specific ring/category of the tech radar. Tech radar must be open. Use to highlight a specific expertise area.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Ring to zoom into',
            enum: ['primary', 'strong', 'ai', 'working'],
          },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_quick_facts',
      description:
        'Show animated quick facts/stats about the portfolio — project count, skill count, years of experience, etc. Use when the user asks for a quick overview or summary stats.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_recommendations',
      description:
        'Open the recommendations panel showing LinkedIn recommendations from colleagues and managers. Use when the user asks about references, what others think, testimonials, or recommendations.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_insight',
      description: 'Generate and display a cross-reference insight card about a specific topic. The card analyzes portfolio data and shows related projects, recommendations, and surprising connections — all tailored to what the visitor is looking for. Use this when a visitor asks deep questions about a skill, domain, or career aspect and you want to give them a rich, analytical overview.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Display title for the insight card panel (e.g. "System Architecture Deep Dive", "iOS Experience Overview")',
          },
          topic: {
            type: 'string',
            description: 'The skill, technology, domain, or career aspect to analyze (e.g. "system-architecture", "iOS development", "team leadership")',
          },
          intent: {
            type: 'string',
            description: 'WHY the visitor is asking — what they want to understand. Be specific about their motivation and what kind of answer would serve them best (e.g. "Recruiter evaluating architecture experience for a senior role, wants concrete examples of system design decisions")',
          },
          visitor_context: {
            type: 'string',
            description: 'Who the visitor is and relevant context (e.g. "Igor from QuantumSoft, interested in hiring for architect role")',
          },
          language: {
            type: 'string',
            description: 'Language to generate the insight in. Use the same language as the current conversation (e.g. "ru" for Russian, "en" for English)',
          },
        },
        required: ['title', 'topic', 'intent', 'language'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hide_panel',
      description:
        'Close the currently open side panel. Use when the conversation moves to a different topic and the current panel is no longer relevant, or when the user explicitly asks to close/dismiss it.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Layer 3 — Data tools (side-effects, no UI)
  // ---------------------------------------------------------------------------
  {
    type: 'function',
    function: {
      name: 'remember_visitor',
      description:
        'Save visitor info when they share their name, company, role, or contact details. Call this EVERY TIME the visitor reveals personal info — name, company, position, email, etc. You can call it multiple times as you learn more. The data is appended, not overwritten.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Visitor name (e.g. "Ivan", "Sarah Chen")',
          },
          company: {
            type: 'string',
            description: 'Company or organization name',
          },
          role: {
            type: 'string',
            description: 'Job title or role (e.g. "CTO", "recruiter", "developer")',
          },
          interest: {
            type: 'string',
            description: 'What they are interested in or looking for (e.g. "hiring iOS dev", "collaboration", "curious about CV projects")',
          },
          email: {
            type: 'string',
            description: 'Email address (e.g. "dolev@gmail.com")',
          },
          telegram: {
            type: 'string',
            description: 'Telegram username (e.g. "@dolev" or "dolev")',
          },
          phone: {
            type: 'string',
            description: 'Phone number (e.g. "+972 52-1234567")',
          },
          linkedin: {
            type: 'string',
            description: 'LinkedIn profile URL or username',
          },
          notes: {
            type: 'string',
            description: 'Any other relevant info about the visitor',
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Layer 4 — Side-effect tools (modify UI outside panels)
  // ---------------------------------------------------------------------------
  {
    type: 'function',
    function: {
      name: 'set_theme',
      description:
        'Switch the UI theme. Includes a secret Fallout/Pip-Boy easter egg theme (green CRT terminal with scanlines). Use "fallout" when the visitor mentions Fallout, retro, hacker mode, matrix, or when you want to surprise them.',
      parameters: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            description: 'Theme to set. "fallout" activates the secret Pip-Boy CRT theme.',
            enum: ['dark', 'light', 'toggle', 'fallout'],
          },
        },
        required: ['theme'],
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Easter eggs / showtime
  // ---------------------------------------------------------------------------
  {
    type: 'function',
    function: {
      name: 'start_showtime',
      description:
        'Launch a dramatic, cinematic storytelling mode. The lights go out, the screen transforms into a dark stage, and a theatrical narrative plays out. Use when the user asks for a dramatic/cinematic version of a story, or when they agree to your offer. If the user explicitly requests drama ("расскажи драматичнее", "with drama", "как в кино", etc.) — call this tool IMMEDIATELY without additional confirmation.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description:
              'The story topic — a catchy dramatic title (e.g. "The Great Deployment Disaster of 2024" or "How a Side Project Became a Product")',
          },
          intent: {
            type: 'string',
            description:
              'What the audience wants to learn — context about why the user asked (e.g. "User wants to know about the hardest technical challenge")',
          },
        },
        required: ['topic', 'intent'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'play_game',
      description: 'Open a mini-game in the side panel for the visitor to play. A fun easter egg! Use when the visitor asks to play, is bored, or you want to lighten the mood.',
      parameters: {
        type: 'object',
        properties: {
          game: {
            type: 'string',
            description: 'Which game to open',
            enum: ['snake', '2048'],
          },
        },
        required: ['game'],
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Layer 2 — Action tools (act inside open panels)
  // ---------------------------------------------------------------------------
  {
    type: 'function',
    function: {
      name: 'scroll_timeline_to',
      description:
        'Smooth-scroll the timeline panel to a specific company entry. Only works when the timeline panel is already open. Use when discussing a particular role or company.',
      parameters: {
        type: 'object',
        properties: {
          company: {
            type: 'string',
            description: 'Company name to scroll to (e.g. "REKAP", "QuantumSoft", "Trax Retail")',
          },
        },
        required: ['company'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'highlight_period',
      description:
        'Pulse/glow a time period on the career timeline. Use to draw attention to a specific role when comparing periods or emphasizing tenure. Timeline must be open.',
      parameters: {
        type: 'object',
        properties: {
          company: {
            type: 'string',
            description: 'Company name whose period to highlight',
          },
          years: {
            type: 'string',
            description: 'Optional year range to highlight (e.g. "2020-2023"). If omitted, highlights the entire tenure.',
          },
        },
        required: ['company'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'focus_screenshot',
      description:
        'Zoom into a specific screenshot in the gallery. Gallery must already be open for the given project. Use when pointing out a specific UI element or screen.',
      parameters: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'Project slug the screenshot belongs to',
          },
          index: {
            type: 'number',
            description: 'Zero-based index of the screenshot to focus on',
          },
        },
        required: ['slug', 'index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'highlight_skill',
      description:
        'Highlight a specific skill in the skills grid with a visual pulse. Skills panel must be open. Use when mentioning a particular technology in conversation.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Skill name to highlight (e.g. "Swift / iOS", "Python / FastAPI", "LLM Agents")',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'highlight_project_detail',
      description:
        'Highlight a specific section of an open project card. Use to draw the user\'s eye to the tech stack, key highlights, description, or links of a project.',
      parameters: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'Project slug whose card is currently open',
          },
          field: {
            type: 'string',
            description: 'Section of the project card to highlight',
            enum: ['stack', 'highlights', 'description', 'links'],
          },
        },
        required: ['slug', 'field'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_projects',
      description:
        'Show two projects side by side for comparison. Use when the user asks to compare projects, or when contrasting two different experiences makes the conversation richer.',
      parameters: {
        type: 'object',
        properties: {
          slug1: {
            type: 'string',
            description: 'First project slug',
          },
          slug2: {
            type: 'string',
            description: 'Second project slug',
          },
        },
        required: ['slug1', 'slug2'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scroll_to_project',
      description:
        'Smooth-scroll the projects timeline to a specific project. Only works when the projects timeline panel is already open. Use when narrating through projects sequentially.',
      parameters: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'Project slug to scroll to',
          },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'highlight_project',
      description:
        'Highlight a specific project in the projects timeline with a visual pulse. Projects timeline must be open. Use when mentioning a project while the timeline is showing all projects.',
      parameters: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'Project slug to highlight',
          },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'highlight_recommendation',
      description:
        'Highlight a specific recommendation by author name. Recommendations panel must be open. Use when discussing a specific person\'s recommendation.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Author name of the recommendation to highlight',
          },
        },
        required: ['name'],
      },
    },
  },
];

// -----------------------------------------------------------------------------
// Context-enriched tools
// -----------------------------------------------------------------------------

/**
 * Returns a copy of the tools array with descriptions enriched by available
 * data values. This lets the model know which slugs, company names, and skill
 * names are valid without hard-coding them in the base definitions.
 */
export function getToolsWithContext(
  projectSlugs: string[],
  companies: string[],
  skillNames: string[],
  recommendationAuthors: string[] = [],
): ToolDefinition[] {
  const slugList = projectSlugs.join(', ');
  const companyList = companies.join(', ');
  const skillList = skillNames.join(', ');
  const authorList = recommendationAuthors.join(', ');

  return tools.map((tool) => {
    const t = structuredClone(tool);
    const { name } = t.function;

    switch (name) {
      case 'show_project':
      case 'show_gallery':
        t.function.description += ` Available project slugs: [${slugList}].`;
        if (t.function.parameters.properties.slug) {
          t.function.parameters.properties.slug.enum = projectSlugs;
        }
        break;

      case 'scroll_timeline_to':
      case 'highlight_period':
        t.function.description += ` Known companies: [${companyList}].`;
        if (t.function.parameters.properties.company) {
          t.function.parameters.properties.company.enum = companies;
        }
        break;

      case 'highlight_skill':
        t.function.description += ` Available skills: [${skillList}].`;
        if (t.function.parameters.properties.name) {
          t.function.parameters.properties.name.enum = skillNames;
        }
        break;

      case 'focus_screenshot':
        t.function.description += ` Available project slugs: [${slugList}].`;
        if (t.function.parameters.properties.slug) {
          t.function.parameters.properties.slug.enum = projectSlugs;
        }
        break;

      case 'highlight_project_detail':
      case 'compare_projects':
      case 'scroll_to_project':
      case 'highlight_project':
        t.function.description += ` Available project slugs: [${slugList}].`;
        if (t.function.parameters.properties.slug) {
          t.function.parameters.properties.slug.enum = projectSlugs;
        }
        if (t.function.parameters.properties.slug1) {
          t.function.parameters.properties.slug1.enum = projectSlugs;
        }
        if (t.function.parameters.properties.slug2) {
          t.function.parameters.properties.slug2.enum = projectSlugs;
        }
        break;

      case 'highlight_recommendation':
        if (recommendationAuthors.length > 0) {
          t.function.description += ` Available authors: [${authorList}].`;
          if (t.function.parameters.properties.name) {
            t.function.parameters.properties.name.enum = recommendationAuthors;
          }
        }
        break;
    }

    return t;
  });
}
