# CountryEdu NexaTask deliverables

This page is the evaluator-facing index for the submitted project. Links target the `main` branch
or the documented local runtime. No public deployment is claimed.

|   # | Required deliverable   | Exact access                                                                                                                                                                                                                                                    | Status                                                           |
| --: | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
|   1 | GitHub repository      | [Nexatask-project-management-system](https://github.com/rohitpokhariya10/Nexatask-project-management-system)                                                                                                                                                    | Available on `main`                                              |
|   2 | Source code            | [React client](https://github.com/rohitpokhariya10/Nexatask-project-management-system/tree/main/client/src) · [Express server](https://github.com/rohitpokhariya10/Nexatask-project-management-system/tree/main/server/src) · [Architecture](./ARCHITECTURE.md) | Available                                                        |
|   3 | Database schema        | [Implemented schema](./DATABASE_SCHEMA.md) · [Mongoose modules](https://github.com/rohitpokhariya10/Nexatask-project-management-system/tree/main/server/src/modules)                                                                                            | Available                                                        |
|   4 | ER diagram             | [Mermaid ERD](./ERD.md)                                                                                                                                                                                                                                         | Available                                                        |
|   5 | API documentation      | [API guide](./API.md) · [local Swagger UI](http://localhost:5000/api/docs) · [local OpenAPI JSON](http://localhost:5000/api/docs.json)                                                                                                                          | Available after local startup                                    |
|   6 | Postman collection     | [Collection file](./postman/CountryEdu-NexaTask.postman_collection.json) · [raw import URL](https://raw.githubusercontent.com/rohitpokhariya10/Nexatask-project-management-system/main/docs/postman/CountryEdu-NexaTask.postman_collection.json)                | Available; v2.1 JSON with an ordered seeded smoke workflow       |
|   7 | README and setup guide | [README](../README.md) · [Demo guide](./DEMO.md)                                                                                                                                                                                                                | Available                                                        |
|   8 | Public deployment link | [Render/Vercel guide](./DEPLOYMENT.md) · [Render Blueprint](../render.yaml) · [Vercel config](../client/vercel.json)                                                                                                                                            | **Blocked — provider login required.** No public URL is claimed. |

## Local evaluation endpoints

After following the root [Evaluator quick path](../README.md#evaluator-quick-path):

- Application: [http://localhost:5173](http://localhost:5173)
- Health: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- Swagger: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- OpenAPI JSON: [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)

Use `admin@nexatask.demo` / `Demo@12345` after running the development seed. Additional Project
Manager and Team Member credentials are listed in the [README](../README.md#seed-data-and-demo-credentials).
