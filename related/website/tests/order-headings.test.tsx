import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it} from 'vitest';
import {OrderList} from '@/features/orders/OrderList';
import {OrderDetail} from '@/features/orders/OrderDetail';

it('order history has a page heading before its request resolves', () => {
  const html = renderToStaticMarkup(createElement(OrderList, {locale:'en'}));
  expect(html.match(/<h1\b[^>]*>.*?<\/h1>/g)).toEqual(['<h1>My orders</h1>']);
});

it('order details have a page heading while loading without exposing a requested identifier', () => {
  const html = renderToStaticMarkup(createElement(OrderDetail, {locale:'en', id:'unverified-order-id'}));
  expect(html.match(/<h1\b[^>]*>.*?<\/h1>/g)).toEqual(['<h1>Order details</h1>']);
  expect(html).not.toContain('unverified-order-id');
});
