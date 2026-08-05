import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { Project } from '../support/api';

test('[F-projects-01] 项目卡片渲染出数据 @functional @feature:3.1', async ({ page }) => {
  const projects = await api<Project[]>('/api/v1/projects');
  await page.goto('/projects');
  if (projects.length > 0) {
    await expect(page.getByText(projects[0].title).first()).toBeVisible();
  } else {
    await expect(page.locator('main')).toBeVisible();
  }
});

test('[F-projects-02] 项目卡片含外链 @functional @feature:3.2', async ({ page }) => {
  const projects = await api<Project[]>('/api/v1/projects');
  const withLink = projects.find((p) => p.url || p.githubUrl);
  test.skip(!withLink, '所有项目均无外链');
  await page.goto('/projects');
  const href = (withLink!.url ?? withLink!.githubUrl)!;
  await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
});
