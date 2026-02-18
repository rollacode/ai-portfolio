// Agent tool definitions in OpenAI function calling format
// Two layers: Panel tools (open/close UI) and Action tools (interact within panels)

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ToolName =
  | 'show_project'
  | 'show_skills'
  | 'show_contact'
  | 'show_timeline'
  | 'show_gallery'
  | 'hide_panel'
  | 'scroll_timeline_to'
  | 'highlight_period'
  | 'focus_screenshot'
  | 'highlight_skill'
  | 'highlight_project_detail'
  | 'compare_projects';

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
      name: 'show_skills',
      description:
        'Open the skills grid panel. Use when the user asks about technical skills, tech stack, or what technologies Andrey knows. Optionally filter by category.',
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
        'Open the contact info panel with email, GitHub, LinkedIn. Use when the user wants to get in touch, hire, or reach out to Andrey.',
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
): ToolDefinition[] {
  const slugList = projectSlugs.join(', ');
  const companyList = companies.join(', ');
  const skillList = skillNames.join(', ');

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
    }

    return t;
  });
}
