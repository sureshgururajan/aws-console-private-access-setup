#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ConsolePrivateAccessValidator } from './validator.js';
import { CloudFormationTemplate } from './types.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const server = new Server(
  {
    name: 'aws-console-private-access-validator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools: Tool[] = [
  {
    name: 'validate-cloudformation',
    description:
      'Validates a CloudFormation template for AWS Console Private Access requirements',
    inputSchema: {
      type: 'object' as const,
      properties: {
        template: {
          type: 'string',
          description: 'CloudFormation template as JSON string',
        },
        templateFile: {
          type: 'string',
          description: 'Path to CloudFormation template file (alternative to template parameter)',
        },
        region: {
          type: 'string',
          description: 'AWS region (default: us-east-1)',
          default: 'us-east-1',
        },
      },
      required: [],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'validate-cloudformation') {
    const { template, templateFile, region = 'us-east-1' } = request.params.arguments as {
      template?: string;
      templateFile?: string;
      region?: string;
    };

    try {
      let parsedTemplate: CloudFormationTemplate;

      if (templateFile) {
        // Read template from file
        const filePath = resolve(templateFile);
        const fileContent = readFileSync(filePath, 'utf-8');
        parsedTemplate = JSON.parse(fileContent);
      } else if (template) {
        // Parse template from string
        parsedTemplate = JSON.parse(template);
      } else {
        throw new Error('Either template or templateFile parameter must be provided');
      }

      const validator = new ConsolePrivateAccessValidator(parsedTemplate, region);
      const result = validator.validate();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                valid: false,
                checks: [],
                summary: `Error processing template: ${errorMessage}`,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${request.params.name}`,
      },
    ],
    isError: true,
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.exit(1);
});
