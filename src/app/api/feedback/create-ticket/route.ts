import { Octokit } from '@octokit/core';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { title, body, label } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body required' }, { status: 400 });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // CREATE ISSUE with label
    const createIssueResponse = await octokit.request('POST /repos/{owner}/{repo}/issues', {
      owner: 'loris-olivier-obi',
      repo: 'feedbacks',
      title,
      body,
      labels: label ? [label] : [],
    });
    const issueNodeId = createIssueResponse.data.node_id;
    const issueUrl = createIssueResponse.data.html_url;

    // ADD TO PROJECT
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
        projectId: process.env.GITHUB_PROJECT_ID,
        contentId: issueNodeId,
      }
    );
    const itemId = (
      addToProject as {
        addProjectV2ItemById: { item: { id: string } };
      }
    ).addProjectV2ItemById.item.id;

    await octokit.graphql(
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
        projectId: process.env.GITHUB_PROJECT_ID,
        itemId,
        fieldId: process.env.STATUS_FIELD_ID,
        optionId: process.env.RECEIVED_ID,
      }
    );

    return NextResponse.json({ issueUrl });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create and add ticket' }, { status: 500 });
  }
}
