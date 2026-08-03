// CI/CD pipeline for park-finder-api (webhook trigger test)
pipeline {
    agent any

    tools {
        nodejs 'node22'
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm install -g yarn --silent'
                sh 'yarn install --frozen-lockfile'
            }
        }
        stage('Lint') {
            steps {
                sh 'npx prettier --check "src/**/*.ts" "test/**/*.ts"'
                sh 'npx eslint "{src,apps,libs,test}/**/*.ts"'
            }
        }
        stage('Test unit') {
            steps {
                sh 'yarn test:unit'
            }
        }
        stage('Deploy') {
            when {
                branch 'develop'
            }
            steps {
                sshagent(credentials: ['scaleway-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no root@51.15.141.96 "\
                          cd /root/park-finder-api && \
                          git pull origin develop && \
                          docker tag park-finder-api-api:latest park-finder-api-api:previous || true && \
                          docker compose up -d --build && \
                          docker compose exec -T api npx prisma migrate deploy && \
                          docker image prune -f && \
                          docker builder prune -af"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline terminé'
            cleanWs()
        }
        failure {
            echo '❌ Pipeline en échec'
        }
    }
}
