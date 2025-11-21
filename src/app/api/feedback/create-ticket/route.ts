// eslint-disable-next-line import/no-extraneous-dependencies
import { Octokit } from '@octokit/core';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { title, body, label, labels, screenshot } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body required' }, { status: 400 });
    }

    if (!process.env.GITHUB_FEEDBACK_TOKEN) {
      // eslint-disable-next-line no-console
      console.error('GITHUB_FEEDBACK_TOKEN is not configured');
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    // eslint-disable-next-line no-console
    console.log(
      'GITHUB_FEEDBACK_TOKEN is configured:',
      process.env.GITHUB_FEEDBACK_TOKEN ? 'Yes' : 'No'
    );

    const octokit = new Octokit({ auth: process.env.GITHUB_FEEDBACK_TOKEN });

    // Check token validity early - fail fast if token is invalid
    try {
      const tokenInfo = await octokit.request('GET /user');
      // eslint-disable-next-line no-console
      console.log('Token authenticated as:', tokenInfo.data.login);

      // Try to check organization access (this helps diagnose private repo access issues)
      try {
        const orgInfo = await octokit.request('GET /orgs/{org}', {
          org: 'openbraininstitute',
        });
        // eslint-disable-next-line no-console
        console.log('Organization access verified:', orgInfo.data.login);
      } catch (orgError) {
        const orgErr = orgError as { status?: number; message?: string };
        // eslint-disable-next-line no-console
        console.warn(
          'Could not verify organization access (this may be normal for private orgs):',
          orgErr.status,
          orgErr.message
        );
        // Don't fail here - organization access check may fail even with valid tokens
      }
    } catch (tokenError) {
      const error = tokenError as { status?: number; message?: string };
      // eslint-disable-next-line no-console
      console.error('Token validation failed:', error);

      if (error.status === 401) {
        return NextResponse.json(
          {
            error:
              'GitHub token is invalid or expired. Please check your GITHUB_FEEDBACK_TOKEN environment variable.',
            help: 'You can create a new token at https://github.com/settings/tokens with the following scopes: repo, project (if using projects)',
          },
          { status: 401 }
        );
      }

      // For other token errors, still try to proceed but log the warning
      // eslint-disable-next-line no-console
      console.warn('Could not verify token, but continuing:', tokenError);
    }

    // eslint-disable-next-line no-console
    console.log('Creating issue with:', { title, body: body.substring(0, 100) + '...', label });

    // CREATE ISSUE with label (label is optional, so we try without it if it fails)
    let createIssueResponse;
    try {
      // First, verify the repository exists and is accessible
      try {
        await octokit.request('GET /repos/{owner}/{repo}', {
          owner: 'openbraininstitute',
          repo: 'feedback',
        });
      } catch (repoError) {
        const error = repoError as { status?: number; message?: string };
        if (error.status === 401) {
          throw new Error(
            'GitHub token is invalid or expired. Please check your GITHUB_FEEDBACK_TOKEN environment variable and ensure it has the "repo" scope.'
          );
        }
        if (error.status === 403) {
          throw new Error(
            'GitHub token does not have permission to access this repository. Please ensure the token has the "repo" scope and access to the "openbraininstitute/feedback" repository.'
          );
        }
        if (error.status === 404) {
          throw new Error(
            'Repository "openbraininstitute/feedback" not found or token does not have access. For private repositories, ensure: 1) The token has the "repo" scope, 2) The token has been granted access to the "openbraininstitute" organization (if required), and 3) The repository name is correct.'
          );
        }
        throw new Error(`Cannot access repository: ${error.message || 'Unknown error'}`);
      }

      // Combine month-year label with feedback type and section labels
      const allLabels: string[] = [];
      if (label) allLabels.push(label);
      if (Array.isArray(labels)) {
        allLabels.push(...labels);
      }

      // Try creating issue with labels
      createIssueResponse = await octokit.request('POST /repos/{owner}/{repo}/issues', {
        owner: 'openbraininstitute',
        repo: 'feedback',
        title,
        body,
        labels: allLabels,
      });
    } catch (labelError) {
      // If label doesn't exist (422), try without the month-year label but keep other labels
      const error = labelError as { status?: number; message?: string };
      if (label && error.status === 422) {
        // Try again without the month-year label, but keep feedback type and section labels
        const labelsWithoutMonthYear = Array.isArray(labels) ? labels : [];
        createIssueResponse = await octokit.request('POST /repos/{owner}/{repo}/issues', {
          owner: 'openbraininstitute',
          repo: 'feedback',
          title,
          body,
          labels: labelsWithoutMonthYear,
        });
      } else if (error.status === 401) {
        throw new Error(
          'GitHub token is invalid or expired. Please check your GITHUB_FEEDBACK_TOKEN environment variable.'
        );
      } else if (error.status === 403) {
        throw new Error(
          'GitHub token does not have permission to create issues. Please ensure the token has the "repo" scope.'
        );
      } else {
        throw labelError;
      }
    }

    const issueNodeId = createIssueResponse.data.node_id;
    const issueUrl = createIssueResponse.data.html_url;
    const issueNumber = createIssueResponse.data.number;

    // eslint-disable-next-line no-console
    console.log('Issue created successfully:', { issueUrl, issueNodeId, issueNumber });

    // Upload screenshot if provided
    let screenshotUrl: string | null = null;
    if (screenshot && typeof screenshot === 'string' && screenshot.startsWith('data:image')) {
      try {
        // Extract base64 data from data URL
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');

        // Create a unique filename
        const timestamp = Date.now();
        const filename = `screenshots/feedback-${issueNumber}-${timestamp}.png`;

        // Upload to repository
        const uploadResponse = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
          owner: 'openbraininstitute',
          repo: 'feedback',
          path: filename,
          message: `Add screenshot for issue #${issueNumber}`,
          content: base64Data,
        });

        // Get the raw content URL (GitHub provides download_url for raw files)
        const { content } = uploadResponse.data;
        if (content && 'download_url' in content) {
          // Use the download_url for raw image access
          screenshotUrl = content.download_url as string;
          // eslint-disable-next-line no-console
          console.log('Screenshot uploaded:', screenshotUrl);

          // Update issue body with screenshot URL
          if (screenshotUrl) {
            const updatedBody = `${body}\n\n## Screenshot\n\n![Screenshot](${screenshotUrl})`;
            await octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
              owner: 'openbraininstitute',
              repo: 'feedback',
              issue_number: issueNumber,
              body: updatedBody,
            });
          }
        }
      } catch (screenshotError) {
        // eslint-disable-next-line no-console
        console.error('Failed to upload screenshot:', screenshotError);
        // Continue without screenshot - issue was created successfully
      }
    }

    // ADD TO PROJECT (optional, continue even if it fails)
    if (!process.env.GITHUB_FEEDBACK_PROJECT_ID) {
      // eslint-disable-next-line no-console
      console.warn('GITHUB_FEEDBACK_PROJECT_ID is not configured, skipping project addition');
    } else {
      try {
        // eslint-disable-next-line no-console
        console.log('Adding issue to project:', {
          projectId: process.env.GITHUB_FEEDBACK_PROJECT_ID,
          issueNodeId,
        });

        // Try to verify the project exists (optional, continue even if it fails)
        try {
          const projectInfo = await octokit.graphql(
            `
            query($projectId: ID!) {
              node(id: $projectId) {
                ... on ProjectV2 {
                  id
                  title
                  number
                }
              }
            }
            `,
            {
              projectId: process.env.GITHUB_FEEDBACK_PROJECT_ID,
            }
          );
          // eslint-disable-next-line no-console
          console.log('Project info:', projectInfo);
        } catch (projectCheckError) {
          // eslint-disable-next-line no-console
          console.warn(
            'Could not verify project (this is okay, will try to add anyway):',
            projectCheckError
          );
          // Don't throw - we'll try to add the item anyway
        }

        const addToProject = await octokit.graphql(
          `
          mutation($projectId: ID!, $contentId: ID!) {
            addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
              item {
                id
              }
            }
          }
          `,
          {
            projectId: process.env.GITHUB_FEEDBACK_PROJECT_ID,
            contentId: issueNodeId,
          }
        );

        // eslint-disable-next-line no-console
        console.log('Project addition response:', addToProject);

        const result = addToProject as {
          addProjectV2ItemById?: { item: { id: string } };
          errors?: Array<{ message: string; type: string }>;
        };

        if (result.errors) {
          // eslint-disable-next-line no-console
          console.error('GraphQL errors when adding to project:', result.errors);
          throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(', ')}`);
        }

        if (!result.addProjectV2ItemById?.item?.id) {
          // eslint-disable-next-line no-console
          console.error('No item ID returned from project addition');
          throw new Error('Failed to add issue to project: No item ID returned');
        }

        const itemId = result.addProjectV2ItemById.item.id;
        // eslint-disable-next-line no-console
        console.log('Issue added to project successfully, itemId:', itemId);

        // Update status (optional, continue even if it fails)
        if (process.env.STATUS_FIELD_ID && process.env.RECEIVED_ID) {
          try {
            const statusResult = await octokit.graphql(
              `
              mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
                updateProjectV2ItemFieldValue(input: {
                  projectId: $projectId
                  itemId: $itemId
                  fieldId: $fieldId
                  value: { singleSelectOptionId: $optionId }
                }) {
                  projectV2Item {
                    id
                  }
                }
              }
              `,
              {
                projectId: process.env.GITHUB_FEEDBACK_PROJECT_ID,
                itemId,
                fieldId: process.env.STATUS_FIELD_ID,
                optionId: process.env.RECEIVED_ID,
              }
            );

            const statusUpdateResult = statusResult as {
              errors?: Array<{ message: string; type: string }>;
            };

            if (statusUpdateResult.errors) {
              // eslint-disable-next-line no-console
              console.error('Failed to update status:', statusUpdateResult.errors);
            }
          } catch (statusError) {
            // Log but don't fail - issue was created successfully
            // eslint-disable-next-line no-console
            console.error('Failed to update status:', statusError);
          }
        }
      } catch (projectError) {
        // Log but don't fail - issue was created successfully
        let errorMessage = 'Issue created but failed to add to project';

        if (projectError instanceof Error) {
          errorMessage = projectError.message;

          // Provide helpful guidance for common errors
          if (errorMessage.includes('Resource not accessible by personal access token')) {
            errorMessage = `Issue created successfully, but could not add to project. Your GitHub token needs the 'project' scope. Please update your token permissions at: https://github.com/settings/tokens`;
          }
        }

        // eslint-disable-next-line no-console
        console.error('Failed to add to project:', {
          error: errorMessage,
          projectError,
          projectId: process.env.GITHUB_FEEDBACK_PROJECT_ID,
          issueNodeId,
          help: 'The token may need the "project" scope. Check token permissions at: https://github.com/settings/tokens',
        });

        // Return a warning but still return success since issue was created
        return NextResponse.json({
          issueUrl,
          warning: errorMessage,
        });
      }
    }

    return NextResponse.json({ issueUrl });
  } catch (error) {
    // Extract more detailed error information
    let errorMessage = 'Failed to create and add ticket';
    let errorDetails: unknown;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
    } else if (typeof error === 'object' && error !== null) {
      // Handle Octokit errors
      const octokitError = error as { message?: string; status?: number; errors?: unknown };
      if (octokitError.message) {
        errorMessage = octokitError.message;
      }
      if (octokitError.errors) {
        errorDetails = octokitError.errors;
      }
      if (octokitError.status) {
        errorMessage = `${errorMessage} (Status: ${octokitError.status})`;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}
