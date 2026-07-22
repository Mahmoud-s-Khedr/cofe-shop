import {
  parseRestApisFromOpenApi,
  parseWsApisFromGatewaySource,
  renderApiListMarkdown,
} from './api-list-generator';

describe('api-list-generator', () => {
  it('maps REST operations with sorting/auth/request/response schemas', () => {
    const rest = parseRestApisFromOpenApi({
      paths: {
        '/z': {
          post: {
            operationId: 'zPost',
            summary: 'Zeta',
            tags: ['ZModule'],
            security: [{ bearer: [] }],
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ZReq' },
                },
              },
            },
            responses: {
              '201': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ZRes' },
                  },
                },
              },
            },
          },
        },
        '/a': {
          get: {
            operationId: 'aGet',
            tags: ['AModule'],
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ARes' },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(rest).toHaveLength(2);
    expect(rest[0].module).toBe('AModule');
    expect(rest[0].method).toBe('GET');
    expect(rest[0].path).toBe('/a');
    expect(rest[0].auth).toBe('public');
    expect(rest[0].responseSchemas[0]?.status).toBe('200');
    expect(rest[0].responseSchemas[0]?.schema?.$ref).toBe('#/components/schemas/ARes');

    expect(rest[1].module).toBe('ZModule');
    expect(rest[1].auth).toBe('bearer');
    expect(rest[1].requestSchema?.$ref).toBe('#/components/schemas/ZReq');
    expect(rest[1].responseSchemas[0]?.status).toBe('201');
    expect(rest[1].responseSchemas[0]?.schema?.$ref).toBe('#/components/schemas/ZRes');
  });

  it('extracts websocket events and emitted events from gateway source', () => {
    const source = `
      @WebSocketGateway({ namespace: '/chat' })
      export class ChatGateway {
        @SubscribeMessage('message.send')
        async send(@ConnectedSocket() client: Socket, @MessageBody() body: SendMessageDto): Promise<Record<string, unknown>> {
          this.server.to('x').emit('message.received', {});
          return { ok: true };
        }

        @SubscribeMessage('conversation.join')
        async join(@MessageBody() payload: JoinConversationDto): Promise<Record<string, unknown>> {
          this.server.emit('conversation.joined', {});
          return { success: true };
        }
      }
    `;

    const ws = parseWsApisFromGatewaySource(source, 'src/chat/chat.gateway.ts');
    expect(ws).toHaveLength(2);

    const join = ws.find((item) => item.event === 'conversation.join');
    const send = ws.find((item) => item.event === 'message.send');

    expect(join).toBeDefined();
    expect(join?.channel).toBe('/chat');
    expect(join?.requestShapeRef).toBe('JoinConversationDto');
    expect(join?.responseShapeRef).toBe('conversation.joined');

    expect(send).toBeDefined();
    expect(send?.requestShapeRef).toBe('SendMessageDto');
    expect(send?.auth).toBe('bearer');
    expect(send?.responseShapeRef).toBe('message.received');
  });

  it('renders deterministic markdown sections for rest and websocket', () => {
    const markdown = renderApiListMarkdown(
      [
        {
          type: 'rest',
          module: 'Auth',
          name: 'AuthController_login',
          method: 'POST',
          path: '/auth/login',
          auth: 'public',
          summary: 'Login',
          requestSchema: { $ref: '#/components/schemas/LoginDto' },
          responseSchemas: [
            { status: '201', schema: { $ref: '#/components/schemas/TokenResponseDto' } },
          ],
          notes: '',
        },
      ],
      [
        {
          type: 'ws',
          module: 'ChatGateway',
          name: 'sendMessage',
          event: 'message.send',
          channel: '/chat',
          auth: 'bearer',
          summary: 'Handle message.send',
          requestShapeRef: 'SendMessageDto',
          responseShapeRef: 'message.received',
          notes: 'JWT required in Socket auth/header during connection.',
        },
      ],
    );

    expect(markdown).toMatchSnapshot();
  });
});
