import fs from 'fs';

const file = './src/navigation/AppNavigator.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `            <CustomToast />
            <CustomAlertComponent />
          </View>
        </NavigationContainer>`;

const replacement = `            <CustomAlertComponent />
          </View>
        </NavigationContainer>
        <CustomToast />`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated AppNavigator");
