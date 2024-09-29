# Implementing CI Pipeline for Nodejs application using github actions

This project aims to implement a CI pipeline that automates the building and testing of a Node.js application using GitHub Actions. It leverages Docker, SonarQube for code quality analysis, and Trivy for container image security scanning.

## Table of Contents  

1. [ Architecture](#architecture)
2. [Build job](#build-job)
3. [SonarQube job ](#sonarqube-job)
    - [perquisites](#perquisites)
    - [deploy SonarQube container](#deploy-sonarqube-container)
    - [Accessing SonarQube](#accessing-sonarqube)
    - [Integration with github Actions pipeline](#integration-with-github-actions-pipeline)
4. [Build and push docker image to AWS ECR](#build-and-push-docker-image-to-aws-ecr)
    - [Authenticate GitHub Actions with AWS using OIDC](#authenticate-github-actions-with-aws-using-oidc)
    - [GitHub Actions Workflow file](#ithub-actions-workflow-file)
    - [VPC](#vpc)

5. [Trivy](#trivy)

    
## Architecture

![Architecture](https://github.com/marwantarek01/assets/blob/main/cipipeline%20arch.png)

- Pipeline Triggered by code commits or pull requests.
- The pipeline builds and runs tests on the Node.js application to ensure code correctness.
- Code is analyzed for quality and security using SonarQube.
- Docker image of the application is created after passing tests and analysis.
- Docker image is pushed to AWS Elastic Container Registry (ECR) for deployment.
- Trivy is utilized  for container image security scanning.

![pipeline run success](https://github.com/marwantarek01/assets/blob/main/Pipeline%20run%20successfully.png)


## Build-job

The first job in the CI pipeline is to generate the `package.json` file and install the application's dependencies.

 ```
 build:
    runs-on: ubuntu-latest
    
    steps:
    - name: checkout code
      uses: actions/checkout@v4          # retrieves repository's code so that it can be accessed in the workflow.

    - name: Setup Node.js environment
      uses: actions/setup-node@v4.0.3     # installs Node.js in the GitHub Actions environment.
    
    - name: create package.json
      run: npm init -y 
 ```

![package.json success](https://github.com/marwantarek01/assets/blob/main/package.json%20success.png)

 

 ## SonarQube job
 
 This section provides a guide on running a SonarQube container to perform code scanning.
 ### perquisites 
 launch AWS EC2 in a private subnet and install docker.

 ### deploy SonarQube container 
```
 docker run -d --name sonarqube \
    -p 9000:9000 \
    -v sonarqube_data:/opt/sonarqube/data \
    -v sonarqube_extensions:/opt/sonarqube/extensions \
    -v sonarqube_logs:/opt/sonarqube/logs \
    sonarqube:10.0.6-community
 ```

 - **docker run -d –name sonarqube :**   creates and starts Docker container named “sonarqube” in detached mode
-  **-p 9000:9000:**  Maps port 9000 on your local machine to port 9000 in the container. 
- **-v option is used to mount Three Docker volumes to ensure persistence:**  `sonarqube_data` for SonarQube data, `sonarqube_extensions` for plugins and extensions, and `sonarqube_logs` for logs.
-  `sonarqube:10.0.6-community`:   SonarQube Docker image name

### Accessing SonarQube

An NGINX reverse proxy is set up on a separate EC2 instance in a public subnet of the same VPC to route traffic to the SonarQube server, enabling access to the SonarQube web console.

![rev-proxy](https://github.com/marwantarek01/assets/blob/main/rev-proxy-arh.png)


### Steps
- 	launch AWS EC2 instance in a public subnet and install nginx.
- create new file in conf.d directory  ``` sudo nano  /etc/nginx/conf.d/reverse-proxy.conf ```
- 	define reverse proxy and restart nginx. 
```
server {
listen 80;
 server_name your-public-ip-or-domain;
 location / { proxy_pass http://sonarqube-private-ip:9000;
}}
```

### Integration with github Actions pipeline  
-	create github app with the necessary permissions and key and install it on the repo.
-	on sonarqube webconsole setup github and add the needed credentials for the created github app.

![sonarqube success](https://github.com/marwantarek01/assets/blob/main/sonarqube%20success.png)

![sonarqube webconsole](https://github.com/marwantarek01/assets/blob/main/sonarqube%20webconsole.png)



## Build and push docker image to AWS ECR
This section provides a guide on how to use GitHub Actions to build and push  docker images to AWS ECR.

### Authenticate GitHub Actions with AWS using OIDC
Instead of using long-term AWS credentials,  OpenID Connect (OIDC) is used to gain temporary access to AWS resources. by generating temporary credentials which is valid for a short time, making it much safer than using long-term access keys

### How OIDC work
1.	**Token Request:** The workflow initiates a request to GitHub for a token from the OIDC (OpenID Connect) provider.
2. **Token Issuance:** GitHub issues a token containing critical metadata, including the identity of the workflow (repository, branch, etc.) and the intended audience (e.g., sts.amazonaws.com), indicating that the token is meant for AWS.
3. **AWS Role Assumption:** The workflow sends the token to AWS, requesting permission to assume a specific role to perform actions such as pushing a Docker image. AWS verifies the token by checking its origin (GitHub's OIDC provider URL) and ensuring the audience is valid (i.e., the token is intended for AWS).
4. **Temporary Access Granted:** Upon successful validation, AWS grants temporary access to the workflow, allowing it to perform the necessary operations.

### Configuration details
- Create aws IAM Role and add the needed policy (for example allow githubActions to push images to AWS ECR)

- add permissions for requesting the JWT in githubAction workflow 
-  follow github documentation for configuration details https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services


### GitHub Actions Workflow file
- use `aws-actions/configure-aws-credentials@v4` to configure AWS credentials
- use `aws-actions/amazon-ecr-login@v2` to login to Amazon ECR
- build and push docker image to AWS ECR 
```
- name: Build, tag, and push docker image to Amazon ECR
        env:
          REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          REPOSITORY: repositry-name
          IMAGE_TAG: latest
        run: |
          docker build -t $REGISTRY/$REPOSITORY:$IMAGE_TAG .
          docker push $REGISTRY/$REPOSITORY:$IMAGE_TAG  
```

## Trivy

This guide explains how to integrate Trivy into your GitHub Actions workflow to scan Docker images and generate security report.

```
 - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@0.20.0
        with:
          image-ref: 'Image URI'
          format: 'sarif'
          output: 'trivy-results.sarif'
```
![trivy, build, push](https://github.com/marwantarek01/assets/blob/main/trivy%2Cbuild%2Cpush.png)

