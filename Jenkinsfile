pipeline {
    // The Jenkins controller uses its own JDK. Build agents provide project tools.
    agent { label "${params.BUILD_AGENT_LABEL ?: 'java25-node24-docker'}" }

    parameters {
        string(name: 'BUILD_AGENT_LABEL', defaultValue: 'java25-node24-docker',
            description: 'Linux build agent with JDK 25, Node 24, Python 3, Trivy and Docker Compose.')
        booleanParam(name: 'DEPLOY', defaultValue: false,
            description: 'Explicitly deploy after every build/test gate passes.')
        string(name: 'DEPLOY_ENV_CREDENTIALS_ID', defaultValue: 'competition-platform-deployment-env',
            description: 'Jenkins Secret File containing the complete configured .env.example values.')
    }

    options {
        disableConcurrentBuilds()
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Build Toolchain') {
            steps {
                sh '''set -eu
java --version
java --version | head -n 1 | grep -Eq '^(openjdk|java) 25([. +]|$)'
node -e 'if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Node 24 required")'
python3 --version
docker compose version
'''
            }
        }

        stage('Backend Build & Test') {
            steps { sh './mvnw -B verify' }
        }

        stage('Frontend Build & Test') {
            steps {
                sh 'cd frontend && npm ci && npm test -- --ci --runInBand --forceExit && npm run build'
            }
        }

        stage('Security Scan') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh 'trivy fs --skip-dirs .git --exit-code 1 --severity HIGH,CRITICAL .'
                }
            }
        }

        stage('Deploy') {
            when {
                expression { params.DEPLOY && currentBuild.currentResult == 'SUCCESS' }
            }
            steps {
                script {
                    if (!params.DEPLOY_ENV_CREDENTIALS_ID?.trim()) {
                        error('Deployment requires a complete Jenkins Secret File environment credential.')
                    }
                    withCredentials([file(credentialsId: params.DEPLOY_ENV_CREDENTIALS_ID,
                        variable: 'PLATFORM_DEPLOY_ENV')]) {
                        sh '''set -eu
test -s "$PLATFORM_DEPLOY_ENV"
python3 infra/deploy/validate_env.py "$PLATFORM_DEPLOY_ENV"
docker compose --env-file "$PLATFORM_DEPLOY_ENV" config --quiet
docker compose --env-file "$PLATFORM_DEPLOY_ENV" pull --ignore-buildable
docker compose --env-file "$PLATFORM_DEPLOY_ENV" build
docker compose --env-file "$PLATFORM_DEPLOY_ENV" up -d --wait --wait-timeout 600
docker compose --env-file "$PLATFORM_DEPLOY_ENV" ps
'''
                    }
                }
            }
        }
    }

    post {
        success { echo 'Build and test gates passed. Deployment runs only when explicitly requested.' }
        unsuccessful { echo 'One or more gates require attention; inspect the stage results.' }
    }
}
