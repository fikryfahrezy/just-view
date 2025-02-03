import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  CloseButton,
  Container,
  Flex,
  Input,
  NumberInput,
  NumberInputField,
  Radio,
  RadioGroup,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast,
} from '@chakra-ui/react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Router from 'next/router';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import styles from '../styles/Home.module.css';

const FileReqAlert = function FileReqAlert() {
  return (
    <Alert status='error' mb='15px'>
      <AlertIcon />
      <AlertDescription>File Required</AlertDescription>
      <CloseButton position='absolute' right='8px' top='8px' />
    </Alert>
  );
};

type ImageFormInputs = {
  name: string;
  source: string;
  source_link: string;
  lat: number;
  lng: number;
  file: string | FileList;
};

type ConnectFormProps = {
  children: (args: UseFormReturn<ImageFormInputs>) => JSX.Element;
};

const ConnectForm = function ConnectForm({ children }: ConnectFormProps) {
  const methods = useFormContext<ImageFormInputs>();

  return children({ ...methods });
};

const MediaLink = function MediaLink() {
  const [input, setInput] = useState('file');

  return (
    <ConnectForm>
      {({ register, reset, getValues, formState: { errors } }) => (
        <>
          <RadioGroup
            onChange={(nextValue) => {
              reset({ ...getValues(), file: undefined });
              setInput(nextValue);
            }}
            value={input}
            mb='15px'
          >
            <Stack direction='row'>
              <Radio value='file'>File</Radio>
              <Radio value='url'>URL</Radio>
            </Stack>
          </RadioGroup>
          {input === 'file' ? (
            <Flex direction='column'>
              <label htmlFor='file'>File</label>
              <input
                {...register('file', { required: true })}
                id='file'
                type='file'
                name='file'
                accept='image/*'
                style={{ marginBottom: '15px' }}
              />
              {errors.file && <FileReqAlert />}
            </Flex>
          ) : (
            <>
              <label htmlFor='file'>URL</label>
              <Input
                {...register('file', { required: true })}
                errorBorderColor='crimson'
                isInvalid={Boolean(errors.file)}
                id='file'
                type='text'
                name='file'
                marginBottom='15px'
              />
            </>
          )}
        </>
      )}
    </ConnectForm>
  );
};

type ImageFormProps = {
  onSubmit: (url: string) => (data: SubmitType) => void;
};

const ImageForm = function ImageForm({ onSubmit }: ImageFormProps) {
  const methods = useForm<ImageFormInputs>();
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = methods;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit('/api/views?q=view'))}>
        <label htmlFor='name'>Name</label>
        <Input
          {...register('name', { required: true })}
          errorBorderColor='crimson'
          isInvalid={Boolean(errors.name)}
          id='name'
          type='text'
          name='name'
          mb='15px'
        />
        <label htmlFor='source'>Source</label>
        <Input
          {...register('source', { required: true })}
          errorBorderColor='crimson'
          isInvalid={Boolean(errors.source)}
          id='source'
          type='text'
          name='source'
          mb='15px'
        />
        <label htmlFor='source-link'>Source Link</label>
        <Input
          {...register('source_link', { required: true })}
          errorBorderColor='crimson'
          isInvalid={Boolean(errors.source_link)}
          id='source-link'
          type='text'
          name='source_link'
          mb='15px'
        />
        <label htmlFor='latitude'>Latitude</label>
        <NumberInput
          errorBorderColor='crimson'
          isInvalid={Boolean(errors.lat)}
          id='latitude'
          name='lat'
          step={0.01}
          mb='15px'
        >
          <NumberInputField {...register('lat', { required: true })} />
        </NumberInput>
        <label htmlFor='longitude'>Longitude</label>
        <NumberInput
          errorBorderColor='crimson'
          isInvalid={Boolean(errors.lng)}
          id='longitude'
          name='lng'
          step={0.01}
          mb='15px'
        >
          <NumberInputField {...register('lng', { required: true })} />
        </NumberInput>
        <MediaLink />
        <Button colorScheme='blue' type='submit'>
          Submit
        </Button>
      </form>
    </FormProvider>
  );
};

type MusicFormProps = {
  onSubmit: (url: string) => (data: SubmitType) => void;
};

type MusicFormInputs = {
  title: string;
  author: string;
  copyright: string;
  file: FileList;
};

const MusicForm = function MusicForm({ onSubmit }: MusicFormProps) {
  const methods = useForm<MusicFormInputs>();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = methods;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit('/api/views?q=music'))}>
        <label htmlFor='title'>Title</label>
        <Input
          {...register('title', { required: true })}
          errorBorderColor='crimson'
          isInvalid={Boolean(errors.title)}
          id='title'
          type='text'
          name='title'
          mb='15px'
        />
        <label htmlFor='author'>Author</label>
        <Input
          {...register('author', { required: true })}
          errorBorderColor='crimson'
          isInvalid={Boolean(errors.author)}
          id='author'
          type='text'
          name='author'
          mb='15px'
        />
        <label htmlFor='copyright'>Copyright &#169;</label>
        <Input
          {...register('copyright', { required: true })}
          errorBorderColor='crimson'
          isInvalid={Boolean(errors.copyright)}
          id='copyright'
          type='text'
          name='copyright'
          mb='15px'
        />
        <Flex direction='column'>
          <label htmlFor='file'>File</label>
          <input
            {...register('file', { required: true })}
            id='file'
            type='file'
            name='file'
            accept='audio/*'
            style={{ marginBottom: '15px' }}
          />
          {errors.file && <FileReqAlert />}
        </Flex>
        <Button colorScheme='blue' type='submit'>
          Submit
        </Button>
      </form>
    </FormProvider>
  );
};

type FetchType = { success: boolean; message: string };
type SubmitType = ImageFormInputs | MusicFormInputs;

export default function Home() {
  const [loading, isLoading] = useState(false);
  const toast = useToast();

  const onSubmit = function onSubmit(url: string) {
    return (data: SubmitType) => {
      const form = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof FileList) form.append(key, value[0]);
        else form.append(key, String(value));
      });

      isLoading(true);
      fetch(url, {
        method: 'POST',
        body: form,
      })
        .then((res) => res.json())
        .then((res: FetchType) => {
          if (!res.success) throw new Error(res.message);
          toast({
            title: 'success',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        })
        .catch(() => {
          toast({
            title: 'fail',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        })
        .finally(() => {
          isLoading(false);
        });
    };
  };

  const logout = function logout() {
    fetch('/api/logout', { method: 'POST' }).then((res) => {
      if (res.status >= 200 && res.status < 300) Router.replace('/');
    });
  };

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name='description' content='Generated by create next app' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <Container
        display='flex'
        minHeight='100vh'
        maxWidth='100vw'
        padding='0.5rem'
        justifyContent='center'
        alignItems='center'
        flexDirection='column'
      >
        <nav style={{ width: '100%' }}>
          <Button colorScheme='red' onClick={logout}>
            Log Out
          </Button>
        </nav>
        <main className={styles.main}>
          <Tabs variant='soft-rounded' colorScheme='green'>
            <TabList>
              <Tab>Image</Tab>
              <Tab>Music</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <ImageForm onSubmit={onSubmit} />
              </TabPanel>
              <TabPanel>
                <MusicForm onSubmit={onSubmit} />
              </TabPanel>
            </TabPanels>
          </Tabs>
          {loading && (
            <Flex marginY='20px'>
              <Spinner marginRight='15px' />
              <Text>Loading ...</Text>
            </Flex>
          )}
        </main>

        <footer className={styles.footer}>
          <a
            href='https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app'
            target='_blank'
            rel='noopener noreferrer'
          >
            Powered by{' '}
            <span className={styles.logo}>
              <Image src='/vercel.svg' alt='Vercel Logo' width={72} height={16} />
            </span>
          </a>
        </footer>
      </Container>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const { auth } = req.cookies;
  const cookieVal = process.env.COOKIE_VAL;

  if (!auth || auth.split('').reverse().join('') !== cookieVal) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
