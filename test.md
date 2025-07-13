```shell
curl --location --request POST 'http://localhost:3000/sys-auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{
    "username": "admin",
    "password": "admin"
}'
```
```shell
curl --location --request POST 'http://localhost:3000/sys-tool/generate-from-table' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoxLCJpYXQiOjE3NTIzODQ5MTYsImV4cCI6MTc1MjQ3MTMxNn0.VZVsGLKkFPAor2Wj7Yw9M9hR40ZA_1aT23YYXxWGp8Y' \
--header 'Content-Type: application/json' \
--data-raw '{
    "tableName": "plugin_single_page",
    "pluginDir": "single-page"
}'
```
