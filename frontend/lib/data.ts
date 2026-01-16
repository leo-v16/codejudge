export const competitions = [
  {
    id: "weekly-contest-300",
    title: "Weekly Contest 300",
    description: "Solve 4 algorithmic problems in 90 minutes.",
    startTime: "Live Now",
    participants: 1240,
    status: "active",
  },
  {
    id: "biweekly-contest-88",
    title: "Biweekly Contest 88",
    description: "Challenge yourself with complex data structures.",
    startTime: "Starts in 2h 30m",
    participants: 530,
    status: "upcoming",
  },
  {
    id: "hackathon-2026",
    title: "Global Hackathon 2026",
    description: "Build the future of AI in this 48-hour marathon.",
    startTime: "Ended",
    participants: 5000,
    status: "ended",
  },
];

export const problems = [
  {
    id: "1",
    title: "Simple Addition",
    difficulty: "Easy",
    acceptance: "98.5%",
    description: `Given two integers read from standard input, print their sum.

Example 1:
Input: 2 3
Output: 5
Explanation: 2 + 3 = 5.`,
    template: `import sys

# Read from standard input
for line in sys.stdin:
    # Parse the input
    parts = line.split()
    if len(parts) >= 2:
        a = int(parts[0])
        b = int(parts[1])
        # Print the result
        print(a + b)
`, 
  },
  {
    id: "2",
    title: "Reverse Integer",
    difficulty: "Medium",
    acceptance: "27.3%",
    description: "Given a signed 32-bit integer x, return x with its digits reversed.",
    template: `class Solution:
    def reverse(self, x: int) -> int:
        pass`,
  },
];