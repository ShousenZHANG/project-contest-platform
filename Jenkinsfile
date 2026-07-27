pipeline {
    agent any

    environment {
        JWT_SECRET           = credentials('JWT_SECRET')
        MAIL_PASSWORD        = credentials('MAIL_PASSWORD')
        MAIL_USERNAME        = credentials('MAIL_USERNAME')
        GITHUB_CLIENT_SECRET = credentials('GITHUB_CLIENT_SECRET')
        GITHUB_CLIENT_ID     = credentials('GITHUB_CLIENT_ID')
        GOOGLE_CLIENT_SECRET = credentials('GOOGLE_CLIENT_SECRET')
        GOOGLE_CLIENT_ID     = credentials('GOOGLE_CLIENT_ID')
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                checkout scm
            }
        }

        stage('Backend Build & Test') {
            steps {
                echo 'Building and testing all backend modules...'
                sh './mvnw -B verify'
            }
        }

        stage('Frontend Build & Test') {
            steps {
                echo 'Installing dependencies, running tests, and building frontend...'
                sh 'cd frontend && npm ci && npm test -- --ci --runInBand --forceExit && npm run build'
            }
        }

        stage('Security Scan') {
            steps {
                echo 'Running security scan (non-blocking)...'
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    sh 'which trivy && trivy fs --exit-code 0 --severity HIGH,CRITICAL . || true'
                }
            }
        }

        stage('Generate .env') {
            steps {
                echo 'Generating .env file with Jenkins credentials...'
                writeFile file: '.env', text: """
JWT_SECRET=${env.JWT_SECRET}
MAIL_PASSWORD=${env.MAIL_PASSWORD}
MAIL_USERNAME=${env.MAIL_USERNAME}
GITHUB_CLIENT_SECRET=${env.GITHUB_CLIENT_SECRET}
GITHUB_CLIENT_ID=${env.GITHUB_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${env.GOOGLE_CLIENT_SECRET}
GOOGLE_CLIENT_ID=${env.GOOGLE_CLIENT_ID}
                """.stripIndent()
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker images...'
                sh 'docker compose pull'
                sh 'docker compose build'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying all services...'
                sh 'docker compose down || true'
                sh 'docker compose up -d'
            }
        }

        stage('Post-deploy Check') {
            steps {
                echo 'Checking running containers...'
                sh 'docker compose ps'
            }
        }
    }

    post {
        success {
            echo 'Deploy succeeded!'
        }
        failure {
            echo 'Deploy failed! Please check build logs.'
        }
    }
}
