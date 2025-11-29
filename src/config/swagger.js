import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Product Inventory API",
      version: "1.0.0",
      description: "API for managing products and user authentication",
    },
    servers: [
      {
        url: "https://products-api-rux3.onrender.com", // Your Live URL
        description: "Production Server",
      },
      {
        url: "http://localhost:3000",
        description: "Local Development",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // This looks for your route files to find the documentation
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
