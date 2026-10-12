/** Stacks offered on the profile; names are proper nouns and never translated. */
export const stackNames = {
  laravel: "Laravel",
  php: "PHP",
  symfony: "Symfony",
  wordpress: "WordPress",
  nodejs: "Node.js",
  nestjs: "NestJS",
  nextjs: "Next.js",
  react: "React",
  vue: "Vue.js",
  angular: "Angular",
  django: "Django",
  fastapi: "FastAPI",
  python: "Python",
  spring: "Spring Boot",
  java: "Java",
  kotlin: "Kotlin",
  dotnet: ".NET",
  go: "Go",
  rails: "Ruby on Rails",
  flutter: "Flutter",
  "react-native": "React Native",
  android: "Android",
  ios: "iOS",
} as const;

export type StackId = keyof typeof stackNames;

export const stackIds = Object.keys(stackNames) as StackId[];
