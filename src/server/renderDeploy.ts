/**
 * Render Deployment Automation Module
 *
 * Permanent deployment hook for service: srv-d9acni5aeets73dk554g
 */

export const RENDER_DEPLOY_HOOK_URL =
  process.env.RENDER_DEPLOY_HOOK_URL ||
  'https://api.render.com/deploy/srv-d9acni5aeets73dk554g?key=BULyDDcebf8';

export interface RenderDeployResponse {
  success: boolean;
  deployId?: string;
  message?: string;
  statusCode?: number;
  data?: any;
}

/**
 * Triggers an immediate deployment on Render using the permanent Deploy Hook URL
 */
export async function triggerRenderDeploy(): Promise<RenderDeployResponse> {
  console.log('[RenderDeploy] Triggering deployment via deploy hook:', RENDER_DEPLOY_HOOK_URL.replace(/key=([^&]+)/, 'key=***'));
  try {
    const res = await fetch(RENDER_DEPLOY_HOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (res.ok) {
      console.log('[RenderDeploy] Deployment successfully triggered on Render:', data);
      return {
        success: true,
        statusCode: res.status,
        deployId: data?.deploy?.id || data?.id,
        message: 'تم إطلاق النشر بنجاح على خوادم Render',
        data,
      };
    } else {
      console.error('[RenderDeploy] Render deploy hook returned error status:', res.status, text);
      return {
        success: false,
        statusCode: res.status,
        message: `فشل إطلاق النشر: كود الحالة ${res.status}`,
        data,
      };
    }
  } catch (err: any) {
    console.error('[RenderDeploy] Network error while calling Render deploy hook:', err);
    return {
      success: false,
      message: err?.message || 'خطأ في الاتصال بخدمة Render',
    };
  }
}
