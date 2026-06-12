// Mobile UI/UX Audit Workflow
// Automated comprehensive mobile design audit for NF-Student-HUB

export const meta = {
  name: 'mobile-uiux-audit',
  description: 'Comprehensive mobile UI/UX audit covering all pages, components, and design issues',
  phases: [
    { title: 'File Analysis', detail: 'Analyze all React pages and components' },
    { title: 'Bug Detection', detail: 'Identify responsive, accessibility, and design issues' },
    { title: 'Design Review', detail: 'Review design consistency and Tailwind usage' },
    { title: 'Recommendations', detail: 'Generate fix proposals with code examples' },
    { title: 'Roadmap', detail: 'Create prioritized implementation plan' },
  ],
}

phase('File Analysis')

// 1. Analyze all pages
const pages = await agent(
  `Analyze all React pages in frontend/src/pages/ directory.
   For each role (mahasiswa, dosen, admin, orangtua, ukm, ormawa, public, auth):
   - List all page files (.jsx)
   - Describe layout structure (grid, flex, containers)
   - Note any fixed widths, heights, or hardcoded sizes
   - Identify responsive classes used (sm:, md:, lg:, xl:)

   Return JSON with structure: { role: string, pages: [{name, layout, fixedSizes, responsiveClasses}] }`,
  {
    label: 'analyze-pages',
    phase: 'File Analysis',
    schema: {
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              pages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    layout: { type: 'string' },
                    issues: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  }
)

// 2. Analyze all components
const components = await agent(
  `Analyze all reusable components in frontend/src/components/ directory.
   For each component file (.jsx):
   - Component name and purpose
   - Layout approach (flex, grid, etc)
   - Props that affect responsive behavior
   - Any hardcoded sizes/colors
   - Touch target sizes (buttons, links, inputs)
   - Typography usage

   Return JSON with: { components: [{name, purpose, layout, props, issues}] }`,
  {
    label: 'analyze-components',
    phase: 'File Analysis',
    schema: {
      type: 'object',
      properties: {
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              purpose: { type: 'string' },
              layout: { type: 'string' },
              issues: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  }
)

// 3. Check Tailwind config and global styles
const tailwindConfig = await agent(
  `Review frontend/tailwind.config.js and frontend/src/styles/ CSS files.
   Analyze:
   - Tailwind theme configuration (spacing, colors, typography)
   - Custom CSS that could be Tailwind
   - Hardcoded pixel values
   - Missing responsive breakpoints
   - Global styles that affect mobile display

   Return JSON with: { spacing, colors, typography, customCss, issues }`,
  {
    label: 'analyze-tailwind',
    phase: 'File Analysis',
    schema: {
      type: 'object',
      properties: {
        spacingSystem: { type: 'string' },
        colorPalette: { type: 'string' },
        typography: { type: 'string' },
        customCssIssues: { type: 'array', items: { type: 'string' } },
        responsiveBreakpoints: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

phase('Bug Detection')

// 4. Identify mobile-specific bugs
const mobileBugs = await agent(
  `Based on previous analysis of NF-Student-HUB frontend, identify all mobile/responsive bugs:

   Categories to check:
   1. Layout Issues: overflow, fixed widths, missing responsive classes
   2. Touch Targets: buttons/links < 48px, inadequate spacing
   3. Typography: unreadable fonts, poor contrast, broken text
   4. Navigation: non-mobile-friendly menus, missing hamburger
   5. Forms: poor input styling, unclear validation
   6. Images: non-responsive, too large for mobile
   7. Spacing: excessive padding, cramped layout
   8. Modals/Overlays: not optimized for mobile screens
   9. Tables: not scrollable or readable on mobile
   10. Colors: insufficient contrast, hard to distinguish

   For each bug, provide: severity (Critical/High/Medium/Low), location, description, impact
   Return JSON with: { bugs: [{title, severity, location, description, impact}] }`,
  {
    label: 'detect-bugs',
    phase: 'Bug Detection',
    schema: {
      type: 'object',
      properties: {
        bugs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              severity: { enum: ['Critical', 'High', 'Medium', 'Low'] },
              category: { type: 'string' },
              location: { type: 'string' },
              description: { type: 'string' },
              impact: { type: 'string' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalBugs: { type: 'number' },
            critical: { type: 'number' },
            high: { type: 'number' },
            medium: { type: 'number' },
            low: { type: 'number' },
          },
        },
      },
    },
  }
)

// 5. Accessibility audit
const accessibilityIssues = await agent(
  `Conduct accessibility audit for mobile:

   Check for:
   - Missing ARIA labels on icon buttons
   - Keyboard navigation (tab order)
   - Color contrast (WCAG AA 4.5:1)
   - Focus indicators visibility
   - Form label associations
   - Semantic HTML usage
   - Touch target sizes for users with motor impairment

   Return JSON with: { issues: [{element, issue, wcagLevel, fix}] }`,
  {
    label: 'a11y-audit',
    phase: 'Bug Detection',
    schema: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              element: { type: 'string' },
              issue: { type: 'string' },
              wcagLevel: { enum: ['A', 'AA', 'AAA'] },
              impact: { type: 'string' },
            },
          },
        },
      },
    },
  }
)

phase('Design Review')

// 6. Check design consistency
const designConsistency = await agent(
  `Review design consistency across NF-Student-HUB:

   Analyze:
   - Spacing consistency (8px grid?)
   - Color palette usage across pages
   - Typography scale (h1, h2, body sizes)
   - Button styles (primary, secondary, disabled)
   - Form element styling
   - Icon set consistency
   - Border radius patterns
   - Shadow/elevation system

   Report where inconsistencies exist and suggest design system improvements.
   Return JSON with: { consistencyIssues: [{element, current, recommended}], designSystemGaps }`,
  {
    label: 'design-consistency',
    phase: 'Design Review',
    schema: {
      type: 'object',
      properties: {
        spacingConsistency: { type: 'string' },
        colorConsistency: { type: 'string' },
        typographyConsistency: { type: 'string' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              element: { type: 'string' },
              issue: { type: 'string' },
              recommendation: { type: 'string' },
            },
          },
        },
      },
    },
  }
)

// 7. Tailwind usage audit
const tailwindUsage = await agent(
  `Audit Tailwind CSS usage in NF-Student-HUB frontend:

   Look for:
   - Hardcoded pixel values that should be Tailwind
   - Missing responsive prefixes (sm:, md:, lg:, xl:)
   - Custom CSS that duplicates Tailwind functionality
   - Unused or redundant classes
   - Colors not in Tailwind palette
   - Opportunities for better utility combinations

   Provide recommendations for modernizing CSS.
   Return JSON with: { hardcodedValues: [], missingResponsive: [], customCssDuplicates: [], improvements: [] }`,
  {
    label: 'tailwind-audit',
    phase: 'Design Review',
    schema: {
      type: 'object',
      properties: {
        hardcodedPixels: { type: 'array', items: { type: 'string' } },
        missingResponsivePrefixes: { type: 'array', items: { type: 'string' } },
        customCssDuplicates: { type: 'array', items: { type: 'string' } },
        improvementSuggestions: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

phase('Recommendations')

// 8. Generate fix recommendations with code examples
const fixRecommendations = await parallel([
  () =>
    agent(
      `Generate code fixes for Critical and High severity bugs found in NF-Student-HUB mobile audit.

       For each bug, provide:
       - Component/file path
       - Before code (the buggy version)
       - After code (the fixed version with Tailwind classes)
       - Explanation of the fix
       - Why this is better for mobile

       Focus on:
       1. Responsive layout issues
       2. Touch target improvements
       3. Typography fixes
       4. Spacing adjustments

       Return JSON with: { fixes: [{file, before, after, explanation}] }`,
      {
        label: 'code-fixes-critical',
        phase: 'Recommendations',
        schema: {
          type: 'object',
          properties: {
            fixes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  file: { type: 'string' },
                  component: { type: 'string' },
                  before: { type: 'string' },
                  after: { type: 'string' },
                  explanation: { type: 'string' },
                },
              },
            },
          },
        },
      }
    ),
  () =>
    agent(
      `Generate design improvement recommendations for NF-Student-HUB based on mobile audit.

       Suggest:
       1. New responsive components needed
       2. Refactoring of existing components
       3. Design tokens that should be standardized
       4. Mobile-specific layouts or breakpoints
       5. Accessibility improvements
       6. Performance optimizations (lazy loading, image optimization, etc)

       For each recommendation, explain the benefit and effort to implement.
       Return JSON with: { recommendations: [{title, benefit, effort, implementation}] }`,
      {
        label: 'design-improvements',
        phase: 'Recommendations',
        schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  category: { type: 'string' },
                  benefit: { type: 'string' },
                  effort: { enum: ['1 hour', '2-4 hours', '1 day', '2-3 days'] },
                  implementation: { type: 'string' },
                },
              },
            },
          },
        },
      }
    ),
  () =>
    agent(
      `Create a mobile-first design system proposal for NF-Student-HUB based on audit findings.

       Define:
       1. Spacing scale with Tailwind mapping
       2. Color palette with semantic meaning
       3. Typography scale (h1-h6, body, caption, button)
       4. Button variants with responsive sizing
       5. Form element standards
       6. Spacing patterns for common layouts
       7. Breakpoint strategy (320px first)
       8. Touch target minimums

       Return JSON with complete design system.`,
      {
        label: 'design-system',
        phase: 'Recommendations',
        schema: {
          type: 'object',
          properties: {
            spacingScale: { type: 'object' },
            colorPalette: { type: 'object' },
            typography: { type: 'object' },
            components: { type: 'object' },
            touchTargets: { type: 'object' },
          },
        },
      }
    ),
])

phase('Roadmap')

// 9. Create implementation roadmap
const roadmap = await agent(
  `Based on all audit findings, create a prioritized implementation roadmap for mobile UI/UX improvements:

   Organize fixes into phases:
   - Phase 1 (CRITICAL - Week 1): Show-stopper bugs preventing mobile use
   - Phase 2 (HIGH - Week 2-3): Important usability issues
   - Phase 3 (MEDIUM - Week 4-5): Design consistency and polish
   - Phase 4 (LOW - Backlog): Nice-to-have improvements

   For each phase, list:
   - Required fixes
   - Estimated hours to complete
   - Dependencies between fixes
   - Testing requirements
   - Files/components affected

   Also provide:
   - Testing strategy (devices, browsers)
   - Success criteria for each phase
   - Risk mitigation for complex fixes

   Return detailed roadmap as JSON.`,
  {
    label: 'create-roadmap',
    phase: 'Roadmap',
    schema: {
      type: 'object',
      properties: {
        phases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phase: { type: 'string' },
              description: { type: 'string' },
              estimatedHours: { type: 'number' },
              fixes: { type: 'array', items: { type: 'string' } },
              testing: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        testingStrategy: { type: 'string' },
        successCriteria: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

// 10. Generate executive summary
log('Compiling audit results and executive summary...')

const summary = await agent(
  `Create an executive summary of the mobile UI/UX audit for NF-Student-HUB.

   Include:
   - Overall assessment (what's working, what needs fixing)
   - Top 10 critical issues blocking good mobile experience
   - Quick wins (easy fixes with big impact)
   - Estimated total effort to fix all issues
   - ROI of improvements (better user retention, accessibility, brand perception)
   - Timeline recommendation
   - Next steps and recommended starting point

   Write this for non-technical stakeholders while being specific about issues.
   Return formatted markdown report.`,
  {
    label: 'executive-summary',
    phase: 'Roadmap',
  }
)

// Final output
return {
  summary: summary,
  bugs: mobileBugs,
  accessibility: accessibilityIssues,
  design: {
    consistency: designConsistency,
    tailwind: tailwindUsage,
  },
  fixes: fixRecommendations,
  roadmap: roadmap,
  totalPhasesPlanned: 4,
  estimatedEffort: '20-30 hours',
}
