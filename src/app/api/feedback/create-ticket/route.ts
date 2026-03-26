import { Octokit } from '@octokit/core';
import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { serverConfig } from '@/config/server';

export async function POST(req: NextRequest) {
  try {
    // Check Bearer token or session
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (bearerToken) {
      const userInfoResponse = await fetch(
        `${serverConfig.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`,
        { headers: { Authorization: `Bearer ${bearerToken}` } }
      );
      if (!userInfoResponse.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      const token = await getToken({ req });
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { title, body, label, labels, screenshot, screenshots } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body required' }, { status: 400 });
    }

    if (!serverConfig.GITHUB_FEEDBACK_TOKEN) {
      // eslint-disable-next-line no-console
      console.error('GITHUB_FEEDBACK_TOKEN is not configured');
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    // eslint-disable-next-line no-console
    console.log(
      'GITHUB_FEEDBACK_TOKEN is configured:',
      serverConfig.GITHUB_FEEDBACK_TOKEN ? 'Yes' : 'No'
    );

    const octokit = new Octokit({ auth: serverConfig.GITHUB_FEEDBACK_TOKEN });

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

    // Format timestamp: DD/MM/YYYY hh:mm
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `🕗 Received at: ${day}/${month}/${year} ${hours}:${minutes}`;

    // Add timestamp to body
    const bodyWithTimestamp = `${body}\n\n---\n\n${timestamp}`;

    // eslint-disable-next-line no-console
    console.log('Creating issue with:', {
      title,
      body: bodyWithTimestamp.substring(0, 100) + '...',
      label,
    });

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
        body: bodyWithTimestamp,
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
          body: bodyWithTimestamp,
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

    // Upload screenshots if provided
    // Support both single screenshot (backward compatibility) and screenshots array
    const allScreenshots: string[] = [];
    if (screenshots && Array.isArray(screenshots)) {
      allScreenshots.push(...screenshots);
    } else if (
      screenshot &&
      typeof screenshot === 'string' &&
      screenshot.startsWith('data:image')
    ) {
      allScreenshots.push(screenshot);
    }

    // eslint-disable-next-line no-console
    console.log('Screenshot data received:', {
      hasScreenshots: !!screenshots,
      screenshotsIsArray: Array.isArray(screenshots),
      screenshotsLength: Array.isArray(screenshots) ? screenshots.length : 0,
      hasScreenshot: !!screenshot,
      screenshotType: typeof screenshot,
      allScreenshotsLength: allScreenshots.length,
    });

    const uploadedScreenshotUrls: string[] = [];

    if (allScreenshots.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Uploading ${allScreenshots.length} screenshot(s)...`);

      for (let i = 0; i < allScreenshots.length; i++) {
        const screenshotData = allScreenshots[i];
        // eslint-disable-next-line no-console
        console.log(`Processing screenshot ${i + 1}:`, {
          hasData: !!screenshotData,
          type: typeof screenshotData,
          startsWithData:
            typeof screenshotData === 'string' ? screenshotData.substring(0, 20) : 'N/A',
        });

        if (
          !screenshotData ||
          typeof screenshotData !== 'string' ||
          !screenshotData.startsWith('data:image')
        ) {
          // eslint-disable-next-line no-console
          console.warn(`Skipping screenshot ${i + 1}: invalid data`);
          continue;
        }

        try {
          // Upload to Imgur (free, reliable image hosting)
          const base64Data = screenshotData.replace(/^data:image\/\w+;base64,/, '');

          // eslint-disable-next-line no-console
          console.log(`Uploading screenshot ${i + 1} to Imgur...`);

          // Use Imgur's anonymous upload API
          // Default client ID for anonymous uploads (can be overridden with env var)
          const imgurClientId = process.env.IMGUR_CLIENT_ID || '546c25a59c58ad7';

          const uploadResponse = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
              Authorization: `Client-ID ${imgurClientId}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64Data,
              type: 'base64',
            }),
          });

          if (uploadResponse.ok) {
            const responseData = (await uploadResponse.json()) as {
              data?: { link?: string };
              success?: boolean;
            };

            if (responseData.success && responseData.data?.link) {
              const screenshotUrl = responseData.data.link;
              uploadedScreenshotUrls.push(screenshotUrl);
              // eslint-disable-next-line no-console
              console.log(`Screenshot ${i + 1} uploaded successfully:`, screenshotUrl);
            } else {
              throw new Error('No URL returned from Imgur');
            }
          } else {
            const errorText = await uploadResponse.text();
            throw new Error(`Imgur upload failed: ${uploadResponse.status} ${errorText}`);
          }
        } catch (screenshotError) {
          // eslint-disable-next-line no-console
          console.error(`Failed to upload screenshot ${i + 1}:`, screenshotError);

          // Add a warning comment to the issue about failed upload
          try {
            await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
              owner: 'openbraininstitute',
              repo: 'feedback',
              issue_number: issueNumber,
              body: `⚠️ Screenshot ${i + 1} failed to upload. Error: ${screenshotError instanceof Error ? screenshotError.message : 'Unknown error'}`,
            });
          } catch (commentError) {
            // eslint-disable-next-line no-console
            console.error('Failed to add error comment:', commentError);
          }
        }
      }

      // Update issue body with uploaded screenshots
      if (uploadedScreenshotUrls.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`Adding ${uploadedScreenshotUrls.length} screenshot(s) to issue body`);

        // Add screenshots as markdown images
        const screenshotSection =
          uploadedScreenshotUrls.length === 1
            ? `\n\n## Screenshot\n\n![Screenshot](${uploadedScreenshotUrls[0]})`
            : `\n\n## Screenshots\n\n${uploadedScreenshotUrls
                .map((url, idx) => `![Screenshot ${idx + 1}](${url})`)
                .join('\n\n')}`;

        const updatedBody = `${bodyWithTimestamp}${screenshotSection}`;

        try {
          await octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
            owner: 'openbraininstitute',
            repo: 'feedback',
            issue_number: issueNumber,
            body: updatedBody,
          });

          // eslint-disable-next-line no-console
          console.log('Issue body updated with screenshots');
        } catch (updateError) {
          const error = updateError as { status?: number; message?: string; errors?: unknown };
          // eslint-disable-next-line no-console
          console.error('Failed to update issue body:', error.status, error.message);
          // Don't throw - issue was created successfully, but log the error
        }
      } else if (allScreenshots.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to upload all screenshots. Total attempted: ${allScreenshots.length}`);
      }
    }

    // ADD TO PROJECT (optional, continue even if it fails)
    const projectId = serverConfig.GITHUB_FEEDBACK_PROJECT_ID;
    if (!projectId || projectId.startsWith('{{') || projectId.trim() === '') {
      // eslint-disable-next-line no-console
      console.warn(
        'GITHUB_FEEDBACK_PROJECT_ID is not configured or is a placeholder, skipping project addition'
      );
    } else {
      try {
        // eslint-disable-next-line no-console
        console.log('Adding issue to project:', {
          projectId: serverConfig.GITHUB_FEEDBACK_PROJECT_ID,
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
          projectId: serverConfig.GITHUB_FEEDBACK_PROJECT_ID,
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
