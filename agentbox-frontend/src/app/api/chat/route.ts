import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, modelIds, options } = body;

    // 验证请求数据
    if (!message || !modelIds || !Array.isArray(modelIds)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // 调用外部后端API
    const backendResponse = await fetch('http://localhost:8080/api/messages/test', {
      method: 'GET',
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend API error: ${backendResponse.status}`);
    }

    // 获取流式响应数据
    const reader = backendResponse.body?.getReader();
    const decoder = new TextDecoder();
    let result = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }
    } else {
      result = await backendResponse.text();
    }

    // 返回响应
    return NextResponse.json({
      responses: result,
      status: 'success',
    });
  } catch (error) {
    console.error('Error processing chat request:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend server' },
      { status: 500 }
    );
  }
}
