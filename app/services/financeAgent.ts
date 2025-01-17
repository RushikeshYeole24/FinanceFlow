import { Agent, Crew, Task } from "crew.ai";

export class FinanceAgent {
  private crew: Crew;
  private analyst: Agent;
  private advisor: Agent;

  constructor() {
    this.crew = new Crew({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Financial Analyst Agent
    this.analyst = new Agent({
      role: "Financial Analyst",
      goal: "Analyze financial data and identify patterns and trends",
      backstory: "Expert financial analyst with deep knowledge of personal finance and market trends",
      allowDelegation: true,
      verbose: true,
    });

    // Financial Advisor Agent
    this.advisor = new Agent({
      role: "Financial Advisor",
      goal: "Provide personalized financial advice and recommendations",
      backstory: "Experienced financial advisor focused on helping individuals achieve their financial goals",
      allowDelegation: true,
      verbose: true,
    });

    this.crew.addAgent(this.analyst);
    this.crew.addAgent(this.advisor);
  }

  async analyzeFinances(userData: {
    income: number;
    expenses: Transaction[];
    savings: number;
    goals: any[];
  }) {
    const tasks: Task[] = [
      {
        description: "Analyze spending patterns and identify areas for improvement",
        agent: this.analyst,
      },
      {
        description: "Generate personalized financial recommendations",
        agent: this.advisor,
      },
    ];

    const result = await this.crew.executeTasks(tasks, { userData });
    return result;
  }
} 