// import Handlebars from "handlebars";
// import * as path from "path";
// import * as fs from "fs";

// const templateCache = new Map<string, HandlebarsTemplateDelegate>();

// const isDev = process.env.NODE_ENV === "development";

// export function renderTemplate(name: string, data: Record<string, any> = {}) {
//   if (!templateCache.has(name) || isDev) {
//     const filePath = path.join(process.cwd(), "src", "app", "dev", "email", `${name}.hbs`);

//     if (!fs.existsSync(filePath)) {
//       throw new Error(`Email template not found: ${filePath}`);
//     }

//     const source = fs.readFileSync(filePath, "utf8");
//     templateCache.set(name, Handlebars.compile(source));
//   }

//   return templateCache.get(name)!({
//     year: new Date().getFullYear(),
//     ...data,
//   });
// }
