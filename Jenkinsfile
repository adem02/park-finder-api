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
    }

    post {
        always {
            echo 'Pipeline terminé'
        }
        failure {
            echo '❌ Pipeline en échec'
        }
    }
}
