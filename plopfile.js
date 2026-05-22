export default function (plop) {
  // GENERATOR 1: CREATE NEW PAGE IN APP ROUTER
  plop.setGenerator("page", {
    description:
      "Create a new Route/Page (with optional layout, loading, and _components folder)",
    prompts: [
      {
        type: "input",
        name: "path",
        message:
          "New Page Route (EG: dashboard/users, (auth)/login, products/[productId]:",
        validate: (value) => {
          if (/.+/.test(value)) return true;
          return "Route cannot be empty";
        },
      },
      {
        type: "checkbox",
        name: "files",
        message: "Choose additional files to generate:",
        choices: [
          {
            name: "layout.tsx (Static Layout)",
            value: "layout",
            checked: false,
          },
          {
            name: "loading.tsx (Loading State)",
            value: "loading",
            checked: false,
          },
          {
            name: "error.tsx (Client Error Handling)",
            value: "error",
            checked: false,
          },
          {
            name: "not-found.tsx (404 Page)",
            value: "not-found",
            checked: false,
          },
          {
            name: "template.tsx (Re-mount Layout)",
            value: "template",
            checked: false,
          },
          {
            name: "Folder _components (Custom local UI Components)",
            value: "components",
            checked: true,
          },
        ],
      },
    ],
    actions: function (data) {
      const pathParts = data.path.split("/");
      const rawName = pathParts[pathParts.length - 1];
      data.name = rawName.replace(/\[|\]|\(|\)/g, "") || "Index";

      const actions = [
        {
          type: "add",
          path: "app/{{path}}/page.tsx",
          templateFile: "plop-templates/route/page.tsx.hbs",
        },
      ];

      const optionalFiles = [
        "layout",
        "loading",
        "error",
        "not-found",
        "template",
      ];
      optionalFiles.forEach((fileType) => {
        if (data.files.includes(fileType)) {
          actions.push({
            type: "add",
            path: `app/{{path}}/${fileType}.tsx`,
            templateFile: `plop-templates/route/${fileType}.tsx.hbs`,
          });
        }
      });

      if (data.files.includes("components")) {
        actions.push({
          type: "add",
          path: "app/{{path}}/_components/.gitkeep",
          template: "",
        });
      }
      return actions;
    },
  });

  // GENERATOR 2: CREATE LOCAL COMPONENT INSIDE _COMPONENTS OF 1 PAGE
  plop.setGenerator("local-ui", {
    description:
      "Create a local UI component within the _components folder of a page",
    prompts: [
      {
        type: "input",
        name: "routePath",
        message: "Page Route containing this component (EG: (auth)/login):",
        validate: (value) =>
          /.+/.test(value) ? true : "Route cannot be empty",
      },
      {
        type: "input",
        name: "name",
        message: "Component Name (Camel Case -EG: LoginForm):",
        validate: (value) => (/.+/.test(value) ? true : "Name cannot be empty"),
      },
    ],
    actions: [
      {
        type: "add",
        path: "app/{{routePath}}/_components/{{pascalCase name}}.tsx",
        templateFile: "plop-templates/component/local-ui.tsx.hbs",
      },
    ],
  });

  // GENERATOR 3: CREATE REUSABLE COMPONENT (UI & LAYOUT)
  plop.setGenerator("component", {
    description:
      "Create a Global Component (Inside components/ui or components/layouts)",
    prompts: [
      {
        type: "list",
        name: "folder",
        message: "Where do you want to create the component?",
        choices: [
          {
            name: "🎨 components/ui (Primitives like Button, Input, Card)",
            value: "ui",
          },
          {
            name: "🧩 components/layouts (Layout components like Header, Container)",
            value: "layouts",
          },
        ],
      },
      // CONTINUE ASKING IF UI IS CHOSEN
      {
        type: "list",
        name: "uiType",
        message:
          "What type of UI component is this? (Used for template structure, but code is the same)",
        when: (answers) => answers.folder === "ui",
        choices: [
          {
            name: "Primitives (Button, Badge, Avatar...)",
            value: "primitives",
          },
          { name: "Forms (Input, Checkbox, Select...)", value: "forms" },
          {
            name: "Data Display (Card, Table, Accordion...)",
            value: "data-display",
          },
          {
            name: "Overlays/Feedback (Modal, Toast, Skeleton...)",
            value: "overlays",
          },
        ],
      },
      // CONTINUE ASKING IF LAYOUT IS CHOSEN
      {
        type: "list",
        name: "layoutType",
        message: "What type of Layout component is this?",
        when: (answers) => answers.folder === "layouts",
        choices: [
          {
            name: "Container (Limit width, center content...)",
            value: "container",
          },
          {
            name: "Navigation (Header, Sidebar, Footer...)",
            value: "navigation",
          },
          {
            name: "Shell (Complex shell like DashboardShell)",
            value: "shell",
          },
          { name: "Grid/Stack (Grid or Stack layout)", value: "grid" },
        ],
      },
      // COMPONENT NAME
      {
        type: "input",
        name: "name",
        message:
          "Component Name (PascalCase - EG: PrimaryButton, DashboardShell):",
        validate: (value) => {
          if (/.+/.test(value)) return true;
          return "Name cannot be empty";
        },
      },
    ],
    actions: function (data) {
      const actions = [];
      const basePath = `components/${data.folder}/{{pascalCase name}}.tsx`;

      // CHOOSE TEMPLATE BASED ON FOLDER AND TYPE
      actions.push({
        type: "add",
        path: basePath,
        templateFile:
          data.folder === "layouts"
            ? "plop-templates/component/layout.tsx.hbs"
            : "plop-templates/component/ui.tsx.hbs",
      });

      return actions;
    },
  });
}
