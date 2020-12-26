const gql = require('graphql-tag');
const { ApolloServer, PubSub, SchemaDirectiveVisitor } = require('apollo-server');
const { defaultFieldResolver, GraphQLString } = require('graphql')

const pubSub = new PubSub();
const NEW_ITEM = 'NEW_ITEM';

class LogDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const resolver = field.resolve || defaultFieldResolver
    field.args.push({
      type: GraphQLString,
      name: 'message'
    })
    field.resolve = (root, {message, ...rest}, ctx, info) => {
      console.log('⚡️ hello', message)
      return resolver.call(this, root, rest, ctx, info)
    }
  }
}

const typeDefs = gql`
  directive @log on FIELD_DEFINITION 

  type User {
    id: ID! @log
    username: String!
    createdAt: Int!
  }

  type Settings {
    user: User!
    theme: String!
  }

  type Item {
    task: String!
  }

  input NewSettingsInput {
    user: ID!
    theme: String!
  }

  type Query {
    me: User!
    settings(user: ID!): Settings!
  }

  type Mutation {
    settings(input: NewSettingsInput): Settings!
    createItem(task: String!): Item!
  }

  type Subscription {
    newItem: Item
  }
`;

const resolvers = {
  Query: {
    me() {
      return {
        id: 1,
        username: 'Ben',
        createdAt: 24345342
      }
    },
    settings(_, {user}) {
      return {
        user,
        theme: 'Light'
      }
    }
  },
  Mutation: {
    settings(_, {input}) {
      return input;
    },
    createItem(_, {task}) {
      const item = { task }
      pubSub.publish(NEW_ITEM, { newItem: item })
      return item
    }
  },
  Subscription: {
    newItem: {
      subscribe: () => pubSub.asyncIterator(NEW_ITEM)
    }
  },
  Settings: {
    user(settings) {
      return {
        id: 1,
        username: 'Ben',
        createdAt: 24345342
      }
    }
  }
}

const server = new ApolloServer({
  typeDefs, resolvers,
  schemaDirectives: {
    log: LogDirective
  },
  context({ connection }) {
    if (connection) {
      return { ...connection.context };
    }
  },
  subscriptions: {
    onConnect(params) {
      
    }
  }
})

server.listen().then(({url}) => console.log(`server at ${url}`))
