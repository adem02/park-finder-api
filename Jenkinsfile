// CI/CD pipeline for park-finder-api (webhook trigger test)
pipeline {
    agent any

    tools {
        nodejs 'node22'
    }

    environment {
        REGISTRY_IMAGE = 'rg.fr-par.scw.cloud/park-finder-staging/api'
        SCW_CONTAINER_ID = '633811ba-701a-484f-8979-54e3b968e893'
        SCW_DEFAULT_REGION = 'fr-par'
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
        stage('Test integration') {
            steps {
                sh 'yarn test:integration'
            }
        }
        stage('Build & Push Image') {
            when {
                branch 'develop'
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'scw-api-key', usernameVariable: 'SCW_ACCESS_KEY', passwordVariable: 'SCW_SECRET_KEY')]) {
                    sh '''
                        echo "$SCW_SECRET_KEY" | docker login rg.fr-par.scw.cloud -u "$SCW_ACCESS_KEY" --password-stdin
                        docker build --target production -t ${REGISTRY_IMAGE}:${GIT_COMMIT} -t ${REGISTRY_IMAGE}:latest .
                        docker push ${REGISTRY_IMAGE}:${GIT_COMMIT}
                        docker push ${REGISTRY_IMAGE}:latest
                    '''
                }
            }
        }
        stage('Run Migrations') {
            when {
                branch 'develop'
            }
            steps {
                withCredentials([string(credentialsId: 'staging-database-url', variable: 'DATABASE_URL')]) {
                    sh 'yarn migrate:deploy'
                }
            }
        }
        stage('Deploy to Serverless Container') {
            when {
                branch 'develop'
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'scw-api-key', usernameVariable: 'SCW_ACCESS_KEY', passwordVariable: 'SCW_SECRET_KEY')]) {
                    sh '''
                        scw container container update ${SCW_CONTAINER_ID} image=${REGISTRY_IMAGE}:${GIT_COMMIT} --wait
                        scw container container redeploy ${SCW_CONTAINER_ID} --wait
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
