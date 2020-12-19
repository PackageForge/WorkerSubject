import { Component } from '@angular/core';
import { test1 } from './tests/test1';
import { test2 } from './tests/test2';
import { test3 } from './tests/test3';
import { test4 } from './tests/test4';
import { test5 } from './tests/test5';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  tests = [test1, test2, test3, test4, test5];
}
