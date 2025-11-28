const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

const app = express();

// Sample Data
const books = [
  {
    id: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    year: 1925,
    genre: 'Novel'
  },
  {
    id: '2',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    year: 1960,
    genre: 'Southern Gothic'
  }
];

// GraphQL Schema
const schema = buildSchema(`
  type Book {
    id: ID
    title: String
    author: String
    year: Int
    genre: String
  }

  type Query {
    books: [Book]
    book(id: ID!): Book
    searchBooks(query: String!): [Book]
  }
`);

// Resolvers
const root = {
  books: () => books,

  book: ({ id }) => books.find(book => book.id === id),

  searchBooks: ({ query }) => {
    const searchTerm = query.toLowerCase();
    return books.filter(
      book =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
    );
  }
};

// GraphQL Route
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true
}));

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}/graphql`);
});
