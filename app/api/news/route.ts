/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const API_KEY = process.env.NEWS_API_KEY;
    
    if (!API_KEY) {
      console.error('NEWS_API_KEY is not defined in environment variables');
      throw new Error('API key not configured');
    }

    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?category=business&language=en&apiKey=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );

    console.log('News API Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('News API Error Response:', errorText);
      throw new Error(`News API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('News API Response:', JSON.stringify(data, null, 2));

    const articles = data.articles.slice(0, 5).map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      publishedAt: new Date(article.publishedAt).toLocaleDateString()
    }));

    return NextResponse.json(articles);
  } catch (error: unknown) {
    console.error('Detailed News API Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error ? error.cause : undefined
    });
    
    return NextResponse.json(
      [
        {
          title: "Market Update Unavailable",
          description: "Please try again later",
          url: "#",
          source: "System",
          publishedAt: new Date().toLocaleDateString()
        }
      ],
      { status: 200 }
    );
  }
} 