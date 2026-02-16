// ============================================================================
// Example Usage of VaultAPI Client
// ============================================================================

import { api, VaultAPI } from './api';

// ============================================================================
// Using the Default Singleton Instance
// ============================================================================

async function exampleUsingSingleton() {
  try {
    // Quick capture
    const captureResult = await api.capture({
      text: 'Build new feature for dashboard',
      source: 'pwa',
      prefix: 'work',
    });
    console.log('Captured item:', captureResult);

    // Get inbox items
    const inbox = await api.getInbox();
    console.log('Inbox items:', inbox.items);

    // Get inbox counts
    const counts = await api.getInboxCounts();
    console.log('Inbox counts:', counts);

    // Process inbox item
    const processResult = await api.processInboxItem(captureResult.id, {
      action: 'task',
      task_data: {
        title: 'Build new feature for dashboard',
        category: 'work',
        status: 'todo',
        priority: 'high',
      },
    });
    console.log('Processed:', processResult);

    // Get tasks
    const tasks = await api.getTasks('work');
    console.log('Work tasks:', tasks.tasks);

    // Create a task
    const newTask = await api.createTask({
      title: 'Review pull requests',
      category: 'work',
      status: 'todo',
      priority: 'medium',
    });
    console.log('Created task:', newTask);

    // Update a task
    const updatedTask = await api.updateTask(newTask.task.id, {
      status: 'in_progress',
    });
    console.log('Updated task:', updatedTask);

    // Get projects
    const projects = await api.getProjects('active');
    console.log('Active projects:', projects.projects);

    // Create a project
    const newProject = await api.createProject({
      title: 'Nitara Development',
      description: 'Personal productivity system',
      status: 'active',
    });
    console.log('Created project:', newProject);

    // Get ideas
    const ideas = await api.getIdeas('inbox');
    console.log('Ideas in inbox:', ideas.ideas);

    // Create an idea
    const newIdea = await api.createIdea({
      title: 'AI-powered task prioritization',
      description: 'Use machine learning to suggest task priorities based on historical data',
      status: 'inbox',
    });
    console.log('Created idea:', newIdea);

    // Get dashboard summary
    const summary = await api.getSummary();
    console.log('Dashboard summary:', summary);
  } catch (error) {
    console.error('API Error:', error);
  }
}

// ============================================================================
// Using a Custom Instance (e.g., for different base URL)
// ============================================================================

async function exampleUsingCustomInstance() {
  const customApi = new VaultAPI('https://api.example.com/v1');

  try {
    const inbox = await customApi.getInbox();
    console.log('Inbox from custom API:', inbox);
  } catch (error) {
    console.error('Custom API Error:', error);
  }
}

// ============================================================================
// React Component Example
// ============================================================================

/*
import React, { useEffect, useState } from 'react';
import { api, InboxItem } from '../services/api';

function InboxComponent() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInbox() {
      try {
        setLoading(true);
        const response = await api.getInbox();
        setItems(response.items);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load inbox');
      } finally {
        setLoading(false);
      }
    }

    loadInbox();
  }, []);

  const handleCapture = async (text: string) => {
    try {
      const result = await api.capture({
        text,
        source: 'pwa',
      });

      // Refresh inbox
      const response = await api.getInbox();
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture item');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Inbox ({items.length})</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.text}
            {item.ai_classification && (
              <span> - {item.ai_classification.category}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
*/

// ============================================================================
// Error Handling Example
// ============================================================================

async function exampleWithErrorHandling() {
  try {
    const result = await api.createTask({
      title: 'Important task',
      category: 'work',
      status: 'todo',
    });
    console.log('Success:', result);
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific error messages from backend
      if (error.message.includes('required')) {
        console.error('Missing required fields:', error.message);
      } else if (error.message.includes('404')) {
        console.error('Resource not found:', error.message);
      } else if (error.message.includes('500')) {
        console.error('Server error:', error.message);
      } else {
        console.error('Unknown error:', error.message);
      }
    }
  }
}

export {
  exampleUsingSingleton,
  exampleUsingCustomInstance,
  exampleWithErrorHandling,
};
